import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressTokenTvl, AddressTvl, BlockAddressPoint, Point } from "../entities";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";

@Injectable()
export class AddressTokenTvlRepository extends BaseRepository<AddressTokenTvl> {
  public constructor(unitOfWork: UnitOfWork) {
    super(AddressTokenTvl, unitOfWork);
  }

  public async getAddressTokenTvl(address: string, tokenAddress: string): Promise<AddressTokenTvl> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.findOne<AddressTokenTvl>(AddressTokenTvl, {
      where: { address, tokenAddress },
    });
  }

  public async upsertAddressTokensTvl(
    addressTokensTvl: QueryDeepPartialEntity<AddressTokenTvl>[],
    addressTvl: QueryDeepPartialEntity<AddressTvl>
  ): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.transaction(async (entityManager) => {
      for (const addressTokenTvl of addressTokensTvl) {
        await entityManager.upsert<AddressTokenTvl>(AddressTokenTvl, addressTokensTvl, ["address", "tokenAddress"]);
      }
      await entityManager.upsert<AddressTvl>(AddressTvl, addressTvl, ["address"]);
    });
  }

  public createDefaultAddressTokenTvl(address: string, tokenAddress: string): AddressTokenTvl {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      address: address,
      tokenAddress: tokenAddress,
      balance: 0,
      tvl: 0,
    };
  }
}
