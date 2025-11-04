// Debug script to check schedule service status
// Run this in browser console on the schedule page

console.log("🔍 Schedule Service Debug Information");
console.log("=====================================");

// Check environment
console.log("Environment:");
console.log("- NODE_ENV:", process?.env?.NODE_ENV || "unknown");
console.log("- Window available:", typeof window !== "undefined");
console.log("- Location:", window?.location?.href || "unknown");

// Check Firebase configuration
try {
  const { DEMO_MODE } = require('./app/lib/firebase');
  console.log("- DEMO_MODE:", DEMO_MODE);
} catch (e) {
  console.log("- Firebase config error:", e.message);
}

// Check localStorage
if (typeof window !== "undefined" && window.localStorage) {
  console.log("\nLocalStorage Data:");
  console.log("- demo-user:", localStorage.getItem("demo-user") ? "exists" : "none");
  console.log("- scheduled-pickups:", localStorage.getItem("scheduled-pickups") ? "exists" : "none");
  
  // Show actual data
  try {
    const demoUser = localStorage.getItem("demo-user");
    if (demoUser) {
      const user = JSON.parse(demoUser);
      console.log("- User name:", user.name);
      console.log("- User ID:", user.id);
    }
    
    const pickups = localStorage.getItem("scheduled-pickups");
    if (pickups) {
      const parsedPickups = JSON.parse(pickups);
      console.log("- Pickups count:", parsedPickups.length);
    }
  } catch (e) {
    console.log("- Error parsing localStorage data:", e.message);
  }
}

// Check auth service
try {
  // This would need to be imported properly in the actual app
  console.log("\nAuth Service:");
  console.log("- Current user available: checking...");
} catch (e) {
  console.log("- Auth service error:", e.message);
}

console.log("\n🎯 Next Steps:");
console.log("1. Open browser console on schedule page");
console.log("2. Check for any error messages");
console.log("3. Verify user is signed in");
console.log("4. Check if demo data is being created");
console.log("5. Monitor network requests if using Firebase");

console.log("\n📝 Common Issues:");
console.log("- User not signed in (requires demo sign-in)");
console.log("- SSR rendering issues (should self-resolve)"); 
console.log("- localStorage not accessible (check privacy settings)");
console.log("- Service initialization timing issues");