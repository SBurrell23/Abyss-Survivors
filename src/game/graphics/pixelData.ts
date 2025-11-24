export interface SpriteDef {
    size: [number, number];
    palette: Record<string, string>;
    data: string[];
}

export const spriteDefinitions: Record<string, SpriteDef> = {
    player: {
        size: [20, 12],
        palette: { 
            '.': 'transparent', 
            'Y': '#FFD700', // Yellow (main body)
            'L': '#FFED4E', // Light Yellow (conning tower)
            'D': '#B8860B', // Dark Yellow (border/shadow)
            'B': '#87CEEB', // Blue (Window)
            'P': '#222222', // Dark (Propeller)
            'O': '#FFA500', // Orange (decoration)
        },
        data: [
            "....................",
            ".........LLL........",
            "........LBBBL.......",
            ".......LBBBBBL......",
            "P..YYYYYYYYYYYYYY....",
            "PP.YYYYYYDDDYYYYYY..",
            "P.PYYYYYDOODYYYYYYY.",
            "PP.YYYYYYDDDYYYYYY..",
            "P..YYYYYYYYYYYYYY....",
            "....................",
            "....................",
            "...................."
        ]
    },
    enemy_fish: { // Used for guppy, piranha
        size: [12, 12],
        palette: { '.': 'transparent', 'R': '#FF6B6B', 'W': '#FFF', 'B': '#000' },
        data: [
            "............",
            "......RR....",
            "....RRRRR...",
            "..RRRRRRR...",
            ".RRWRRRRRR..",
            "RRBWRRRRRRRR",
            ".RRWRRRRRR..",
            "..RRRRRRR...",
            "....RRRRR...",
            "......RR....",
            "............",
            "............"
        ]
    },
    enemy_shark: {
        size: [24, 16],
        palette: { '.': 'transparent', 'G': '#708090', 'W': '#FFFFFF', 'B': '#000000' },
        data: [
            "........................",
            ".............G..........",
            "............GG..........",
            "...........GGG..........",
            "..........GGGG..........",
            ".........GGGGG..........",
            "........GGGGGGGG........",
            ".......GGGGGGGGGG.......",
            "......GGGGGGGGGGGG......",
            ".....GGGGGGWBBGGGGG.....",
            "....GGGGGGWWWBGGGGGG....",
            "...GGGGGGWWWWWWGGGGG....",
            "..GGGGGGWWWWWWWWGGGG....",
            ".GGGGGGGGWWWWGGGGGGG....",
            "GGGGGGGGGGGGGGGGGGG.....",
            "........................"
        ]
    },
    enemy_ray: {
        size: [24, 24],
        palette: { '.': 'transparent', 'B': '#4682b4', 'D': '#2f577a' },
        data: [
            "...........B............",
            "..........BBB...........",
            ".........BBBBB..........",
            "........BBBBBBB.........",
            ".......BBBBBBBBB........",
            "......BBBBBBBBBBB.......",
            ".....BBBBBBBBBBBBB......",
            "....BBBBBBBBBBBBBBB.....",
            "...BBBBBBBBBBBBBBBBB....",
            "..BBBBBBBBBBBBBBBBBBB...",
            ".BBBBBBBBBBBBBBBBBBBBB..",
            "BBBBBBBBBBBBBBBBBBBBBBB.",
            ".BBBBBBBBBBBBBBBBBBBBB..",
            "..BBBBBBBBBBBBBBBBBBB...",
            "...BBBBBBBBBBBBBBBBB....",
            "....BBBBBBBBBBBBBBB.....",
            ".....BBBBBBBBBBBBB......",
            "......BBBBBBBBBBB.......",
            ".......DD.....DD........",
            "........D.....D.........",
            "........D.....D.........",
            "........D.....D.........",
            "........D.....D.........",
            "........................"
        ]
    },
    enemy_turtle: {
        size: [20, 18],
        palette: { '.': 'transparent', 'G': '#228b22', 'S': '#8fbc8f' },
        data: [
            ".......SSSSS........",
            ".....SSSSSSSS.......",
            "....SSSSSSSSSS......",
            "...SSSSSSSSSSSS.....",
            "..SSSGSSSSSGSSS.....",
            "..SSGGSSSSGGSSS.....",
            ".SSSGGSSSSGGSSSS....",
            ".SSSGSSSSSGSSSSS....",
            ".SSSSSSSSSSSSSSS....",
            ".SSSSSSSSSSSSSSS....",
            "..SSSSSSSSSSSSSS....",
            "...GGGGGGGGGGGG.....",
            "....GGGGGGGGGG......",
            ".....G......G.......",
            ".....G......G.......",
            ".....G......G.......",
            "....................",
            "...................."
        ]
    },
    enemy_crab: {
        size: [14, 14],
        palette: { '.': 'transparent', 'O': '#FF8C00', 'R': '#8B0000' },
        data: [
            "O....O....O...",
            ".O..O.O..O....",
            "..OO...OO.....",
            ".OOOOOOOOO....",
            "OOOOOOOOOOO...",
            "OOOOOOOOOOO...",
            "OOOOOOOOOOO...",
            ".OOOOOOOOO....",
            "..OO...OO.....",
            ".O.......O....",
            "..............",
            "..............",
            "..............",
            ".............."
        ]
    },
    enemy_squid: {
        size: [14, 14],
        palette: { '.': 'transparent', 'P': '#FF00FF', 'D': '#800080' },
        data: [
            ".....PPP......",
            "...PPPPPPP....",
            "..PPPPPPPPP...",
            "..PPPPPPPPP...",
            "..PPPPPPPPP...",
            "...PPPPPPP....",
            "...D.D.D.D....",
            "...D.D.D.D....",
            "...D.D.D.D....",
            "...D.D.D.D....",
            "..D..D..D..D..",
            "..............",
            "..............",
            ".............."
        ]
    },
    enemy_horror: {
        size: [32, 32],
        palette: { '.': 'transparent', 'B': '#000000', 'R': '#FF0000', 'P': '#4B0082' },
        data: [
            "...........BBBBBBB..............",
            "........BBBBBBBBBBBBB...........",
            "......BBBBBBBBBBBBBBBBB.........",
            ".....BBBBBBBBBBBBBBBBBBB........",
            "....BBBBBBBBBBBBBBBBBBBBB.......",
            "...BBBBBBBBBBBBBBBBBBBBBBB......",
            "..BBBBBBBBBBBBBBBBBBBBBBBBB.....",
            ".BBBBBBBBBBBBBBBBBBBBBBBBBBB....",
            ".BBBBBRRBBBBBRRBBBBBRRBBBBBB....",
            "BBBBBBRRBBBBBRRBBBBBRRBBBBBBB...",
            "BBBBBBRRBBBBBRRBBBBBRRBBBBBBB...",
            "BBBBBBBBBBBBBBBBBBBBBBBBBBBBB...",
            "BBBBBBBBBBBBBBBBBBBBBBBBBBBBB...",
            ".BBBBBBBBBBBBBBBBBBBBBBBBBBB....",
            ".BBBBBBBBBBBBBBBBBBBBBBBBBBB....",
            "..BBBBBBBBBBBBBBBBBBBBBBBBB.....",
            "...BBBBBBBBBBBBBBBBBBBBBBB......",
            "....BBPPPPBBBBBBBPPPPBBBB.......",
            ".....BPPPPBBBBBBBPPPPBBB........",
            ".....BPPPPBBBBBBBPPPPBBB........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "......PPPP.......PPPP...........",
            "................................",
            "................................",
            "................................",
            "................................"
        ]
    },
    projectile_torpedo: {
        size: [8, 4],
        palette: { '.': 'transparent', 'C': '#00FFFF', 'W': '#FFFFFF' },
        data: [
            "CCWWCC..",
            "CCCCCC..",
            "CCWWCC..",
            "........"
        ]
    },
    treasure_chest: {
        size: [16, 14],
        palette: { '.': 'transparent', 'G': '#FFD700', 'B': '#8B4513', 'L': '#000000' },
        data: [
            "....GGGGGGGG....",
            "..GGBBBBBBBBGG..",
            ".GBBBBBBBBBBBBG.",
            "GBBBBBBBBBBBBBBG",
            "GBBBBBBBLLBBBBBG",
            "GBBBBBBBLLBBBBBG",
            "GGGGGGGGGGGGGGGG",
            "GBBBBBBBLLBBBBBG",
            "GBBBBBBBLLBBBBBG",
            "GBBBBBBBBBBBBBBG",
            "GBBBBBBBBBBBBBBG",
            ".GBBBBBBBBBBBBG.",
            "..GGBBBBBBBBGG..",
            "....GGGGGGGG...."
        ]
    },
    xp_orb: {
        size: [8, 8],
        palette: { '.': 'transparent', 'G': '#00FF00', 'L': '#CCFFCC' },
        data: [
            "..GGGG..",
            ".GLLLLG.",
            "GLLLLLLG",
            "GLLLLLLG",
            "GLLLLLLG",
            "GLLLLLLG",
            ".GLLLLG.",
            "..GGGG.."
        ]
    },
    background_tile: {
        size: [32, 32],
        palette: { '.': '#001e36', 'D': '#00182b' },
        data: [
            "................................",
            ".D..............................",
            "......D.........................",
            "...................D............",
            "............D...................",
            "................................",
            ".....D...................D......",
            "................................",
            "...................D............",
            "..D.............................",
            ".........................D......",
            "............D...................",
            "................................",
            ".....D..........................",
            "...................D............",
            "................................",
            "..........D.....................",
            ".........................D......",
            "..D.............................",
            "...................D............",
            "................................",
            ".....D...................D......",
            "............D...................",
            "................................",
            "...................D............",
            "................................",
            "..D.........D...................",
            ".........................D......",
            ".....D..........................",
            "...................D............",
            "................................",
            "..........D....................."
        ]
    }
}
