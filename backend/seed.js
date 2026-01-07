const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Book = require('./models/Book');
const RedemptionCode = require('./models/RedemptionCode');
const Package = require('./models/Package');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Book.deleteMany({});
    await RedemptionCode.deleteMany({});
    await Package.deleteMany({});

    console.log('Creating demo users...');
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      isAdmin: true,
      checks: 1000
    });

    const user1 = await User.create({
      username: 'john',
      email: 'john@example.com',
      password: 'john123',
      isAdmin: false,
      checks: 100
    });

    const user2 = await User.create({
      username: 'jane',
      email: 'jane@example.com',
      password: 'jane123',
      isAdmin: false,
      checks: 50
    });

    console.log('Creating demo books...');
    const books = await Book.create([
      {
        title: 'TurnItIn Check',
        author: 'Service',
        description: 'Plagiarism similarity check via TurnItIn. Requires file upload.',
        price: 1
      },
      {
        title: 'JavaScript for Beginners',
        author: 'John Doe',
        description: 'Learn JavaScript from scratch with practical examples.',
        price: 50
      },
      {
        title: 'Advanced Node.js Patterns',
        author: 'Jane Smith',
        description: 'Master advanced patterns and best practices in Node.js development.',
        price: 75
      },
      {
        title: 'MongoDB Guide',
        author: 'Mike Johnson',
        description: 'Complete guide to MongoDB database design and queries.',
        price: 60
      },
      {
        title: 'Web Development Essentials',
        author: 'Sarah Williams',
        description: 'Essential concepts for modern web development.',
        price: 40
      }
    ]);

    console.log('Creating redemption codes...');
    const codes = await RedemptionCode.create([
      { code: 'WELCOME100', checks: 100 },
      { code: 'BONUS50', checks: 50 },
      { code: 'SUMMER25', checks: 25 },
      { code: 'SPECIAL200', checks: 200 },
      { code: 'NEW75', checks: 75 }
    ]);

    console.log('Creating credit packages...');
    const packages = await Package.create([
      { id: 'pack-1', label: '1 Check', checks: 1, priceUsd: 4, order: 0 },
      { id: 'pack-5', label: '5 Checks', checks: 5, priceUsd: 15, order: 1 },
      { id: 'pack-10', label: '10 Checks', checks: 10, priceUsd: 30, order: 2 },
      { id: 'pack-20', label: '20 Checks', checks: 20, priceUsd: 50, order: 3 },
      { id: 'pack-50', label: '50 Checks', checks: 50, priceUsd: 120, order: 4 },
      { id: 'pack-100', label: '100 Checks', checks: 100, priceUsd: 220, order: 5 },
      { id: 'unlimited-1w', label: 'Unlimited 1 Week (3 checks/day)', checks: 3, priceUsd: 30, isUnlimited: true, order: 6 },
      { id: 'unlimited-1m', label: 'Unlimited 1 Month (10 checks/day)', checks: 10, priceUsd: 120, isUnlimited: true, order: 7 }
    ]);

    console.log('Database seeded successfully!');
    console.log(`
      Admin User:
      Email: admin@example.com
      Password: admin123
      Checks: 1000
      
      Demo Users:
      Email: john@example.com, Password: john123
      Email: jane@example.com, Password: jane123
      
      Redemption Codes:
      WELCOME100, BONUS50, SUMMER25, SPECIAL200, NEW75
      
      Books Created: ${books.length}
      Packages Created: ${packages.length}
    `);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
