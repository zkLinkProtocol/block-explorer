import { Injectable } from "@nestjs/common";
import { Transfer } from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransferRepository } from "./addressTransfer.repository";

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  public constructor(unitOfWork: UnitOfWork, private readonly addressTransferRepository: AddressTransferRepository) {
    super(Transfer, unitOfWork);
  }

  public async getDeposits(address: Buffer, blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(
      `SELECT * FROM transfers WHERE type = 'deposit' AND "from" = $1 AND "blockNumber" <= $2;`,
      [address, blockNumber]
    );
  }

  public async getBlockDeposits(blockNumber: number): Promise<Transfer[]> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    return await transactionManager.query(`SELECT * FROM transfers WHERE type = 'deposit' AND "blockNumber" = $1;`, [
      blockNumber,
    ]);
  }

  public override async addMany(records: Partial<Transfer>[]): Promise<void> {
    await super.addMany(records);

    const addressTransfers = records.flatMap((record) => {
      const { number, ...addressTransfer } = record;
      const transferNumber = Number(number);

      if (addressTransfer.from === addressTransfer.to) {
        return { ...addressTransfer, address: record.from, transferNumber };
      }
      return [
        {
          ...addressTransfer,
          address: record.from,
          transferNumber,
        },
        {
          ...addressTransfer,
          address: record.to,
          transferNumber,
        },
      ];
    });

    return this.addressTransferRepository.addMany(addressTransfers);
  }
}
