const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

const { MongoClient } = require('mongodb');

const uri = 'INSERT HERE';
const options = {};

let mongoClient = new MongoClient(uri, options);

async function processHistory() {

  // init the db connection
  const client = await mongoClient.connect();
  const db = client.db();
  const statsCollection = db.collection('statistics');

  console.log('Backing up existing statistics...');
  const allStats = await statsCollection.find({}).toArray();
  const backupFileName = `stats-backup-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(backupFileName, JSON.stringify(allStats, null, 2));
  console.log(`Successfully backed up ${allStats.length} documents to ${backupFileName}`);

  const deleteBeforeDate = new Date('2025-09-09');
  console.log(`Deleting records from statsCollection with timestamp before ${deleteBeforeDate.toISOString()}`);
  const deleteResult = await statsCollection.deleteMany({
    timestamp: { $lt: deleteBeforeDate }
  });
  console.log(`Deleted ${deleteResult.deletedCount} documents.`);

  const history = await fetch('https://bristoltrees.space/BGS/home.xq?mode=archive&format=xml');
  const historyData = await history.text();
  const jObj = new XMLParser().parse(historyData);

  console.log(jObj.periods.period.length);

  const newData = []

  for (const period of jObj.periods.period) {
    const timestamp = new Date(Date.parse(period.ts));
    
    if (timestamp >= deleteBeforeDate)
    {
      continue;
    }
    let summary = {
      timestamp,
      totalSites: period['n-sites'],
      totalArea: period['total-area'],
      totalBaselineHUs: period.baseline['total-HU-area'] + period.baseline['total-HU-hedgerows'] + period.baseline['total-HU-watercourses'],
      totalCreatedHUs: period.improvement['total-HU-area'] + period.improvement['total-HU-hedgerows'] + period.improvement['total-HU-watercourses'],
      totalAllocationHUs: period['total-allocation-HU-area'] + period['total-allocation-HU-hedgerow'] + period['total-allocation-HU-watercourse'],
      numAllocations: period['n-allocations'],
      baselineAreaSize: period.baseline['total-size-area'],
      baselineWatercourseSize: period.baseline['total-size-watercourse'],
      baselineHedgerowSize: period.baseline['total-size-hedgerows'],
      improvementsAreaSize: period.improvement['total-size-area'],
      improvementsWatercourseSize: period.improvement['total-size-watercourse'],
      improvementsHedgerowSize: period.improvement['total-size-hedgerows'],
      baselineParcels: period.baseline['total-parcels-area'] + period.baseline['total-parcels-hedgerows'] + period.baseline['total-parcels-watercourses'],
      improvementsParcels: period.improvement['total-parcels-area'] + period.improvement['total-parcels-hedgerows'] + period.improvement['total-parcels-watercourses'],
      allocatedParcels: period.allocations['total-parcels-area'] + period.allocations['total-parcels-hedgerows'] + period.allocations['total-parcels-watercourses'],
    }
    
    console.log(JSON.stringify(summary));

    newData.push(summary);
    

  }
  
  await statsCollection.insertMany(newData);

  console.log(`added ${newData.length} documents.`);
}

processHistory();