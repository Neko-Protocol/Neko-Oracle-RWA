// Main circuit:
//  - p1: private feed with 7 decimal places (e.g., 3000000000 represents 300.00, price * 1e7)
//  - p2: private feed with 7 decimal places (e.g., 3000000000 represents 300.00, price * 1e7)
//  - asset_id: public (binds proof to an asset, e.g. TSLA)
// Returns: public (final_price with 2 decimals, asset_id)
// Throws an error if one price is more than 7% over the other
fn main(
    p1: u64,
    p2: u64,
    asset_id: pub str<4>,
) -> pub (u64, str<4>) {
    assert(p1 > 0);
    assert(p2 > 0);

    // Normalize both prices from 7 decimals to 2 decimal places
    // Divide by 100000 (1e5) to convert from 1e7 to 1e2 (2 decimals)
    let p1_normalized = p1 / 100000;
    let p2_normalized = p2 / 100000;

    let diff = if p1_normalized > p2_normalized { 
        p1_normalized - p2_normalized 
    } else { 
        p2_normalized - p1_normalized 
    };
    let max = if p1_normalized > p2_normalized { 
        p1_normalized 
    } else { 
        p2_normalized 
    };

    // Ensure prices are within 7% of each other, otherwise fail
    assert(diff * 100 <= max * 7);

    // Average the two normalized prices (both now have 2 decimal places)
    let final_price = (p1_normalized + p2_normalized) / 2;

    (final_price, asset_id)
}

#[test]
fn test_main() {
    let asset_id: str<4> = "TSLA";
    
    // Test Case 1: p1=300.00 (3000000000), p2=300.01 (3000100000)
    // p1_normalized = 3000000000 / 100000 = 30000
    // p2_normalized = 3000100000 / 100000 = 30001
    // average = (30000 + 30001) / 2 = 30000 (represents 300.00)
    let (price, id) = main(3000000000, 3000100000, asset_id);
    assert(price == 30000);
    assert(id == asset_id);
    
    // Test Case 2: p1=395.23 (3952300000), p2=395.25 (3952500000)
    // p1_normalized = 3952300000 / 100000 = 39523
    // p2_normalized = 3952500000 / 100000 = 39525
    // average = (39523 + 39525) / 2 = 39524 (represents 395.24)
    let (price2, id2) = main(3952300000, 3952500000, asset_id);
    assert(price2 == 39524);
    assert(id2 == asset_id);
    
    // Test Case 3: Equal prices p1=200.00 (2000000000), p2=200.00 (2000000000)
    let (price3, id3) = main(2000000000, 2000000000, asset_id);
    assert(price3 == 20000); // Represents 200.00
    assert(id3 == asset_id);
    
    // Test with different asset - prices at 7% threshold
    let asset_id_btc: str<4> = "BTC ";
    // p1=100.00 (1000000000), p2=107.00 (1070000000) - exactly 7% diff
    // p1_normalized = 1000000000 / 100000 = 10000
    // p2_normalized = 1070000000 / 100000 = 10700
    // diff = 700, max = 10700, diff * 100 = 70000, max * 7 = 74900
    // 70000 <= 74900 (within threshold)
    // average = (10000 + 10700) / 2 = 10350 (represents 103.50)
    let (price4, id4) = main(1000000000, 1070000000, asset_id_btc);
    assert(price4 == 10350);
    assert(id4 == asset_id_btc);
}
