import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = 'QLSieuThiMini';

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('SanPham');

  const products = await collection.find({}, { projection: { MaSP: 1 } }).toArray();
  console.log(`Found ${products.length} products in ${dbName}.SanPham`);

  let updated = 0;
  for (const p of products) {
    const imagePath = `/images/products/${p.MaSP}.jpg`;
    const res = await collection.updateOne(
      { MaSP: p.MaSP },
      { $set: { HinhAnh: imagePath, NgayCapNhat: new Date() } }
    );
    if (res.modifiedCount > 0) updated++;
  }

  console.log(`Successfully updated ${updated} products with HinhAnh.`);

  // Verify sample
  const sample = await collection.findOne({ MaSP: 'SP001' });
  console.log('Sample SP001:', { MaSP: sample.MaSP, TenSP: sample.TenSP, HinhAnh: sample.HinhAnh });
} catch (error) {
  console.error('Error updating product images:', error);
  process.exit(1);
} finally {
  await client.close();
}
