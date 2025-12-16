const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Book = require('./models/Book');
const RedemptionCode = require('./models/RedemptionCode');

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
    `);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
