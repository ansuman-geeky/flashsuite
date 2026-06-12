const rawItems = [
    { text: 'A', y: 10, fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', color: 'red', x: 10, width: 5 },
    { text: 'B', y: 10, fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: 'red', x: 20, width: 5 },
    { text: 'C', y: 10, fontSize: 12, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', color: 'red', x: 30, width: 5 }
];

const lines = [];
for (const item of rawItems) {
    let matchedLine = lines.find(line => {
        const yMatch = Math.abs(line.y - item.y) < item.fontSize * 0.3;
        if (!yMatch) return false;
        
        const firstInLine = line.items[0];
        if (firstInLine.fontFamily !== item.fontFamily ||
            firstInLine.fontWeight !== item.fontWeight ||
            firstInLine.fontStyle !== item.fontStyle ||
            firstInLine.color !== item.color) {
            return false;
        }

        return line.items.some(existing => {
            const gapLeft = item.x - (existing.x + existing.width);
            const gapRight = existing.x - (item.x + item.width);
            return gapLeft < item.fontSize * 1.5 && gapRight < item.fontSize * 1.5;
        });
    });
    
    if (matchedLine) {
        matchedLine.items.push(item);
    } else {
        lines.push({ y: item.y, fontSize: item.fontSize, items: [item] });
    }
}

console.log(JSON.stringify(lines, null, 2));
