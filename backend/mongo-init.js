// MongoDB initialization script for EcoWaste Manager
db = db.getSiblingDB('ecowaste');

// Create collections with initial data
db.createCollection('users');
db.createCollection('waste_entries');
db.createCollection('hubs');
db.createCollection('collections');
db.createCollection('analytics');

// Insert initial hub data
db.hubs.insertMany([
  {
    _id: ObjectId(),
    name: "Downtown Recycling Center",
    location: {
      type: "Point",
      coordinates: [-74.0060, 40.7128] // New York City coordinates
    },
    address: "123 Main St, New York, NY 10001",
    wasteTypes: ["plastic", "paper", "glass", "metal"],
    capacity: 1000,
    currentLoad: 350,
    status: "active",
    operatingHours: {
      open: "08:00",
      close: "18:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    },
    contactInfo: {
      phone: "+1-555-0123",
      email: "downtown@ecowaste.com"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: ObjectId(),
    name: "Green Valley Hub",
    location: {
      type: "Point",
      coordinates: [-74.0080, 40.7200]
    },
    address: "456 Eco Street, New York, NY 10002",
    wasteTypes: ["organic", "compost", "garden"],
    capacity: 800,
    currentLoad: 200,
    status: "active",
    operatingHours: {
      open: "09:00",
      close: "17:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    contactInfo: {
      phone: "+1-555-0124",
      email: "greenvalley@ecowaste.com"
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Insert sample waste categories
db.waste_categories.insertMany([
  {
    _id: ObjectId(),
    name: "Plastic",
    category: "recyclable",
    description: "Plastic bottles, containers, and packaging",
    recyclingTips: [
      "Clean containers before recycling",
      "Remove caps and labels when possible",
      "Check recycling symbols"
    ],
    environmentalImpact: {
      decompositionTime: "450 years",
      carbonFootprint: "high",
      recyclability: "high"
    }
  },
  {
    _id: ObjectId(),
    name: "Paper",
    category: "recyclable",
    description: "Newspapers, cardboard, office paper",
    recyclingTips: [
      "Keep paper dry",
      "Remove staples and tape",
      "Separate cardboard from paper"
    ],
    environmentalImpact: {
      decompositionTime: "2-6 weeks",
      carbonFootprint: "medium",
      recyclability: "very high"
    }
  },
  {
    _id: ObjectId(),
    name: "Organic Waste",
    category: "compostable",
    description: "Food scraps, yard waste, biodegradable materials",
    recyclingTips: [
      "Separate from non-organic waste",
      "Use compostable bags",
      "Include fruit peels and vegetable scraps"
    ],
    environmentalImpact: {
      decompositionTime: "2-8 weeks",
      carbonFootprint: "low",
      recyclability: "high (composting)"
    }
  }
]);

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 }, { unique: true });
db.hubs.createIndex({ "location": "2dsphere" });
db.waste_entries.createIndex({ "userId": 1, "createdAt": -1 });
db.collections.createIndex({ "hubId": 1, "date": -1 });

print("Database initialized successfully with sample data!");