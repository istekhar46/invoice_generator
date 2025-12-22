import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      displayName: 'Test User',
      passwordHash: hashedPassword,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create a company profile for the test user
  const companyProfile = await prisma.companyProfile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      businessName: 'Test Electrical Services',
      address: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zipCode: '12345',
      phone: '(555) 123-4567',
      email: 'business@testelectrical.com',
      taxNumber: 'TAX123456',
      defaultLaborRate: 75.0,
      defaultTaxRate: 0.08,
    },
  });

  console.log('✅ Created company profile for:', companyProfile.businessName);

  // Create a test customer
  const testCustomer = await prisma.customer.upsert({
    where: { id: 'test-customer-id' },
    update: {},
    create: {
      id: 'test-customer-id',
      userId: testUser.id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '(555) 987-6543',
      address: '456 Oak Ave',
      city: 'Somewhere',
      state: 'CA',
      zipCode: '54321',
    },
  });

  console.log('✅ Created test customer:', testCustomer.name);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e: Error) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });