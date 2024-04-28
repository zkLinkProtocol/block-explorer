import { Injectable } from "@nestjs/common";
import { Transfer , TransferType} from "../entities";
import { UnitOfWork } from "../unitOfWork";
import { BaseRepository } from "./base.repository";
import { AddressTransferRepository } from "./addressTransfer.repository";
import { MoreThanOrEqual } from "typeorm";
import { BigNumber } from "ethers";

@Injectable()
export class TransferRepository extends BaseRepository<Transfer> {
  public constructor(unitOfWork: UnitOfWork, private readonly addressTransferRepository: AddressTransferRepository) {
    super(Transfer, unitOfWork);
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
  public async updateTransfer(number: Number, gateway: string): Promise<void> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    await transactionManager.update(
        this.entityTarget,
        {
          number,
        },
        {
          gateway,
        }
    );
  }

  public async getLast7DaysWithdrawalTransferAmount(): Promise<BigNumber> {
    const transactionManager = this.unitOfWork.getTransactionManager();
    const res = await transactionManager.find(this.entityTarget, {
      where: {
        type: TransferType.Withdrawal,
        timestamp: MoreThanOrEqual(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toString()),
        tokenAddress: "0x000000000000000000000000000000000000800A",
      },
    });
    return res.reduce((acc, cur) => BigNumber.from(acc).add(BigNumber.from(cur.amount)), BigNumber.from(0));
  }
}
