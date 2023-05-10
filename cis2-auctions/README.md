## Build

- ### [Install tools for development](https://developer.concordium.software/en/mainnet/smart-contracts/guides/setup-tools.html#setup-tools)

- ### [Build the Smart Contract Module](https://developer.concordium.software/en/mainnet/smart-contracts/guides/compile-module.html)

  - Make sure your working directory is [cis2-auctions](./) ie `cd cis2-auctions`.
  - Execute the following commands

    ```bash
    cis2-auctions$ cargo concordium build --out ./module.wasm --schema-out ./schema.bin --schema-embed
    ```

  - You should have [module file](./module.wasm) & [schema file](./schema.bin) if everything has executed normally

- ### Deploy

  ```bash
  concordium-client module deploy ./module.wasm --sender new --grpc-ip 127.0.0.1 --grpc-port 20000
  ```

### Utils

- To convert schema file to hex

  ```bash
  xxd -c 10000 -p ./schema.bin > schema.hex
  ```
