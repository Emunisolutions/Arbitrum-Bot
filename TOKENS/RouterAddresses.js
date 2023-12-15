const Routers = [
  {
    routerAddress: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    quoterAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    version: 3,
    exchange: "uniswap",
    feeTiers: [500, 3000, 10000],
  },
  {
    routerAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    version: 2,
    exchange: "uniswap",
  },
  {
    routerAddress: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    version: 2,
    exchange: "sushiswap",
  },
];
module.exports = Routers;
