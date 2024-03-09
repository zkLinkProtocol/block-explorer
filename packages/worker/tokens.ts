export default [
  {
    "address":[
      {
        "chain": "Ethereum",
        "l1Address": "0x2593f2930feb95ef7461cabe3f1ca8f3dd3d0da8",
        "l2Address": "0x8f12a1a00520071D9C91dccd34C7E426B61Bd12a"
      },
      {
        "chain": "Linea",
        "l1Address": "0x3119fd5290e3b946a0398dc6571de0ff378da5fd",
        "l2Address": "0x3Af585b8d06F7c31E389d7A611F505A9EFEBEc73"
      }
    ],
    "symbol": "USDC",
    "decimals": 6,
    "cgPriceId": "tether",
    "type": "Stablecoin",
    "yieldType": ["NOVA Points"],
    "multiplier": 1.2
  },
  {
    "address":[
      {
        "chain": "Ethereum",
        "l1Address": "0xa07250fa05e585ee78f6abe77a0ba83835c8cedf",
        "l2Address": "0x613C35CE63507e009aD248363686DE2a5c0b3f57"
      },
      {
        "chain": "Linea",
        "l1Address": "0x457e705c8552f79ae70bec19df5cd46f05384fca",
        "l2Address": "0xf4A2b19eE8A8e285C2BcBeE246eA721DAC349377"
      }
    ],
    "decimals": 18,
    "symbol": "wETH",
    "cgPriceId": "ethereum",
    "type": "LSD",
    "yieldType": ["NOVA Points"],
    "multiplier": 2
  }
]