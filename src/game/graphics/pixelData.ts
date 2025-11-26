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
            "......PP..BBBBBBB..PP...........",
            "......PP..BBBBBBB..PP...........",
            "......PP..BBBBBBB..PP...........",
            "......PP..BBBBBBB..PP...........",
            "......PP...........PP...........",
            "......PP...........PP...........",
            "......PP...........PP...........",
            "......PP...........PP...........",
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
        palette: { '.': 'transparent', 'G': '#DEBC1B', 'B': '#8B4513', 'L': '#000000', 'R': '#2B2B2B' },
        data: [
            "....GGGGGGGG....",
            "..GGBBBBBBBBGG..",
            ".GBBBBBBBBBBBBG.",
            "GBBBBBBBBBBBBBBG",
            "GBBBBBBLLBBBBBBG",
            "GBBBBBLLLLBBBBBG",
            "GGGGGGRRRRGGGGGG",
            "GBBBBBLLLLBBBBBG",
            "GBBBBBBLLBBBBBBG",
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
    boss_kraken: {
        size: [32, 32],
        palette: { 
            '.': 'transparent', 
            'M': '#7b1fa2', // Main Body (Purple)
            'D': '#4a148c', // Dark Body (Shadow)
            'L': '#ae52d4', // Light Body (Highlight)
            'E': '#FFFF00', // Eye Sclera (Yellow)
            'P': '#000000', // Pupil
            'S': '#4a0072'  // Spots/Texture
        },
        data: [
            "...........DDDDDDDD.............",
            ".........DDMMMMMMMMDD...........",
            ".......DDMMMMMMMMMMMMDD.........",
            "......DMMMMMMMMMMMMMMMMD........",
            ".....DMMMMMMMMMMMMMMMMMMD.......",
            "....DMMMMMMMMMMMMMMMMMMMMD......",
            "...DMMMMMMMMMMMMMMMMMMMMMMD.....",
            "...DMMMMMMMMMMMMMMMMMMMMMMD.....",
            "..DMMMMMMMMMMMMMMMMMMMMMMMMD....",
            "..DMMMMMMMMMMMMMMMMMMMMMMMMD....",
            ".DMMMMMMMMMMMMMMMMMMMMMMMMMMD...",
            ".DMMMMMMMMMMMMMMMMMMMMMMMMMMD...",
            ".DMMMMMEEEEEEMMMMEEEEEEMMMMMD...",
            ".DMMMMEEEEEEEEMMEEEEEEEEMMMMD...",
            ".DMMMMEPPPPPPEMMEPPPPPPEMMMMD...",
            ".DMMMMEPPPPPPEMMEPPPPPPEMMMMD...",
            ".DMMMMEPPPPPPEMMEPPPPPPEMMMMD...",
            ".DMMMMEEEEEEEEMMEEEEEEEEMMMMD...",
            ".DMMMMMEEEEEEMMMMEEEEEEMMMMMD...",
            ".DMMMMMMMMMMMMMMMMMMMMMMMMMMD...",
            ".DMMMMMMMMMMMMMMMMMMMMMMMMMMD...",
            ".DMMMMMMMMMMMMMMMMMMMMMMMMMMD...",
            "..DMMMMMMMMMMMMMMMMMMMMMMMMD....",
            "..DMMMMMMMMMMMMMMMMMMMMMMMMD....",
            "...DMMMMMMMMMMMMMMMMMMMMMMD.....",
            "...DMMMMMMMMMMMMMMMMMMMMMMD.....",
            "....DMMMMMMMMMMMMMMMMMMMMD......",
            ".....DMMMMMMMMMMMMMMMMMMD.......",
            "......DDMMMMMMMMMMMMMMDD........",
            "........DDDMMMMMMMMDDD..........",
            "...........DDDDDDDD.............",
            "................................"
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
    },
    medkit: {
        size: [12, 12],
        palette: {
            '.': 'transparent',
            'R': '#cc0000', // Less bright red (main body)
            'W': '#ffffff', // White (cross)
            'D': '#990000', // Dark red (shadow/border)
            'L': '#ff3333'  // Light red (highlight)
        },
        data: [
            "............",
            "...DDDDDD...",
            "..DRRRRRRD..",
            ".DRRRRRRRRD.",
            ".DRRRRRRRRD.",
            ".DRRRWRRRRD.",
            ".DRRRRRRRRD.",
            ".DRRRWRRRRD.",
            ".DRRRRRRRRD.",
            "..DRRRRRRD..",
            "...DDDDDD...",
            "............"
        ]
    }
}
