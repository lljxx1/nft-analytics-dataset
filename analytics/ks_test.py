"""
Created on Mon Sep 13 16:47:06 2021
KS test on table that has minting accounts and rarity data
@author: nbax1
"""

import collections
from scipy import stats
import random
import numpy as np
import pandas as pd
import json
import os.path
import sys

"""
Update Parameters Here
"""

P_VAL = 0.001

"""
Helper Functions
"""


def generateSyntheticDataset(size, maxRarity, mode = 'default'):
    """
    generates a synthetic dataset for sanity checks
    MODIFY THIS FUNCTION IF YOU'RE ANALYZING A COLLECTION WITH NON-UNIFORM DISTRIBUTION
    inputs:
        size: number of NFTs purchased by synthetic buyer
        maxRarity: should be the number of NFTs in synthetic collection
        mode: default buys at random. If mode is a float then x% of buys will be in top 5% of rarity
    """
    if mode == 'default':
        #=modify this to select sequential token_ids or only from a subset of collection
        random_sample = random.sample(range(1, maxRarity), size)
        
        return np.array(random_sample)
    else:
        num_rigged_buys = int(mode * size)
        rigged_buys = random.sample(range(1, int(maxRarity / 20) ), num_rigged_buys)
        random_buys = random.sample(range(1, maxRarity), size - len(rigged_buys))
        return np.array(rigged_buys + random_buys)


def getRarityArray(data, account):
    """
    inputs: dataframe with columns to_account and rarity
    account: the account to get data from
    returns: array with rarity rank of every NFT minted by an account
    """
    return np.array(data[data['to_account'] == account]['rank'])


def cal_average(num):
    """
    inputs:
        data: dataframe with columns to_account and rarity
    """
    sum_num = 0
    for t in num:
        sum_num = sum_num + t           

    avg = sum_num / len(num)
    return avg


def find_anomalies(data, threshold = 2,num_replicates = 1):
    """
    Prints KS test results for every account in collection that was anomalously lucky
    inputs: 
        data: dataframe with column 'to_account' for account that minted NFT, and 'rank' for rarity ranking
        threshold: integer for minimum number of NFTs minted by account to be included in analysis
        num_replicates: set to 1 if not generating synthetic datasets (used when rarity is non-uniformly distributed)

    """
    vc = data.to_account.value_counts()

    num_datapoints = len(data)
    accountList = []
    for account in vc[vc > threshold].index:
        lowest_list=[]

        rarity_array = getRarityArray(data, account)
        num_minted = len(rarity_array)
        num_anomalies = 0
        p_values=[]
        for x in range(0, num_replicates):
            '''
            #make synthetic dataset to compare to actual data
            synthetic = generateSyntheticDataset(num_minted, num_datapoints)
            '''
            #generate uniform distribution
            synthetic = np.array(range(1,num_datapoints+1))
            ks = stats.kstest(rvs = synthetic, cdf = rarity_array, alternative = 'less')
            
            if ks[1] < P_VAL:#raise and you will get more hits
                num_anomalies += 1
                p_values.append(ks[1])
                
        if num_anomalies >= num_replicates * 0.8: #arbitrary threshold

            accountResult = dict()
            accountResult['account'] = account
            accountResult['score'] = str(cal_average(p_values))
            accountResult['num_transactions'] = str(len(data[data['to_account']==account]['txid'].unique()))
            accountResult['num_minted'] = str(len(data[data['to_account']==account]))

            print(account + ',' + str(cal_average(p_values)))
            print('num_transactions: '+ str(len(data[data['to_account']==account]['txid'].unique())))
            print('num_minted:' + str(len(data[data['to_account']==account])))
            #outputs lowest rank for each mint transaction
            for transaction in data[data['to_account'] == account]['txid'].unique():
                lowest_rank = min(data[data['txid']==transaction]['rank'])
                token_id = data.loc[data['rank'] == lowest_rank, 'TOKEN_ID'].values[0]
                lowest_list.append([str(lowest_rank), str(token_id)])
                    
            print('{rank, token_id}')
            print(lowest_list)
            print('\n')
            print('\n')

            accountResult['lowest_list'] = lowest_list
            accountList.append(accountResult)
        
    return accountList

"""
Generate Report
"""

# COLLECTIONS = ["boredapeyachtclub", "meebits", "lootproject", "cool-cats-nft", "veefriends"]
collectionName = "topCollection200"
if len(sys.argv) > 1 :
    collectionName = sys.argv[1]

print(collectionName)

taskFile = '../{}.json'.format(collectionName)
testOutputFile = '../{}-withtest.json'.format(collectionName)

collection = open(taskFile)
topCollections = json.load(collection)
newCollections = []

print(len(topCollections))
for COLLECTION in topCollections:
    datasetfile = '../dataset/{}/minting.csv'.format(COLLECTION['slug'])
    if os.path.isfile(datasetfile) :
        try:
            data_to_analyze = pd.read_csv(datasetfile)
            print("\n")
            print(COLLECTION['name'])
            print('Number of buyers:' + str(len(data_to_analyze['to_account'].unique())))
            print('Lucky Buyer,p')
            testResult = find_anomalies(data_to_analyze)
            COLLECTION['ks_test_result'] = testResult
            newCollections.append(COLLECTION)
        except:
            print('failed')
        json.dump(newCollections, open(testOutputFile, 'w'))
