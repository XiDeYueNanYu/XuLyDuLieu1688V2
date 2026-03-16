// js/modes/mode3.js
import { Utils } from '../utils.js';

export const mode3 = {
    id: 'mode3',
    name: 'MODE 3 (Tách phiên bản trong ◤ ◥)',
    execute: (cleanedText, inputs) => {
        const products = [];
        
        // 1. Lấy cụm "价格" dựa trên logic hàng trống (\n\n)
        let globalPriceNote = "";
        let minPriceInGlobal = Infinity;
        
        const jgKey = "价格";
        const jgIdx = cleanedText.indexOf(jgKey);
        
        if (jgIdx !== -1) {
            // Lấy toàn bộ văn bản từ vị trí "价格"
            const fromJg = cleanedText.substring(jgIdx);
            
            // Tìm vị trí hàng trống đầu tiên (\n\n hoặc \r\n\r\n) để kết thúc cụm giá
            const endOfNoteIdx = fromJg.search(/\n\s*\n/);
            
            if (endOfNoteIdx !== -1) {
                globalPriceNote = fromJg.substring(0, endOfNoteIdx).trim();
            } else {
                // Nếu không thấy hàng trống, lấy đến khi gặp link ảnh đầu tiên
                const firstLinkMatch = fromJg.match(/https?:\/\//);
                globalPriceNote = firstLinkMatch ? fromJg.substring(0, firstLinkMatch.index).trim() : fromJg.trim();
            }

            // Trích xuất giá thấp nhất từ cụm globalPriceNote vừa lấy được
            const globalPrices = globalPriceNote.match(/¥\s*([\d.,]+)/g) || [];
            globalPrices.forEach(pStr => {
                // Xử lý cả dấu phẩy (81,00) và dấu chấm (81.00)
                const num = parseFloat(pStr.replace('¥', '').replace(/,/g, '.').trim());
                if (!isNaN(num) && num < minPriceInGlobal) minPriceInGlobal = num;
            });
        }

        // 2. Tách sản phẩm theo Link ảnh
        const parts = cleanedText.split(/(?=https?:\/\/)/).filter(p => p.trim() !== "");

        parts.forEach(part => {
            const lines = part.trim().split('\n').map(l => l.trim()).filter(l => l !== "");
            
            // Chỉ xử lý nếu dòng đầu là link ảnh và không phải link 1688 chi tiết
            if (lines.length >= 2 && lines[0].startsWith('http') && !lines[0].includes('detail.1688.com')) {
                const imgLink = lines[0];
                const mainName = lines[1];
                
                // Tìm nội dung trong cặp ◤ ◥ trong toàn bộ khối text của sản phẩm
                let bracketContent = "";
                const bracketMatch = part.match(/◤([\s\S]*?)◥/);
                if (bracketMatch) {
                    bracketContent = bracketMatch[1].trim();
                }

                // Đếm số lượng giá tiền (dấu ¥) có trong ngoặc ◤ ◥
                const pricesInBracket = bracketContent.match(/¥\s*([\d.,]+)/g) || [];
                const symbolCount = pricesInBracket.length;
                
                let finalPrice = Infinity;

                // Tính giá thấp nhất hiện có bên trong ngoặc
                pricesInBracket.forEach(pStr => {
                    const num = parseFloat(pStr.replace('¥', '').replace(/,/g, '.').trim());
                    if (!isNaN(num) && num < finalPrice) finalPrice = num;
                });

                // --- LOGIC ƯU TIÊN THEO YÊU CẦU ---
                // Nếu chỉ có 1 giá trong ◤ ◥, ưu tiên lấy giá sàn từ cụm "价格"
                if (symbolCount === 1 && minPriceInGlobal !== Infinity) {
                    finalPrice = minPriceInGlobal;
                }

                // Nếu sau tất cả vẫn không tìm thấy giá, dùng defaultPrice
                if (finalPrice === Infinity) {
                    finalPrice = inputs.defaultPrice || 0;
                }

                products.push({
                    image: Utils.cleanImageUrl(imgLink),
                    name: mainName,
                    price: finalPrice,
                    note: (globalPriceNote ? globalPriceNote + "\n---\n" : "") + (bracketContent || "Không có thông tin phiên bản")
                });
            }
        });

        return products;
    }
};