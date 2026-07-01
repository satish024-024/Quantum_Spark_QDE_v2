// Clear Dashboard Cache - Run this in browser console (F12)

// Clear all widget caches
console.log('🧹 Clearing all dashboard caches...');

const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('widget_cache_')) {
        keysToRemove.push(key);
    }
}

console.log(`Found ${keysToRemove.length} cache entries to clear:`);
keysToRemove.forEach(key => {
    console.log(`  Removing: ${key}`);
    localStorage.removeItem(key);
});

console.log('✅ Cache cleared! Now refresh the page (Ctrl+F5)');
console.log('');
console.log('📊 To verify data is loading correctly, run this:');
console.log('fetch("/api/jobs").then(r => r.json()).then(data => console.log("Jobs:", data.length, "items", data))');
