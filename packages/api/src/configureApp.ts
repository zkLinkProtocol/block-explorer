import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as JSONStream from "JSONStream";
import * as fs from "fs";
import * as path from "path";

export const configureApp = (app: INestApplication) => {
  app.useGlobalPipes(
    new ValidationPipe({
      disableErrorMessages: false,
      transform: true,
      whitelist: true,
    })
  );
};

export interface IHistoryToken {
    address: string;
    name: string;
}

export async function getHistoryTokenList(): Promise<IHistoryToken[]> {
    const filePath = path.join(__dirname, "../historyTokenList.json");
    const readStream = fs.createReadStream(filePath);
    const jsonStream = JSONStream.parse("*");
    readStream.pipe(jsonStream);
    const res = [];
    await new Promise((resolve, reject) => {
        jsonStream.on("data", (item: any) => {
            res.push(item);
        });

        jsonStream.on("end", resolve);
        jsonStream.on("error", reject);
    });
    return (res as IHistoryToken[]).map((item) => ({
        ...item,
        address: item.address.toLowerCase(),
    }));
}
