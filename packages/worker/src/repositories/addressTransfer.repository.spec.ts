import { Test, TestingModule } from "@nestjs/testing";
import { EntityManager, SelectQueryBuilder } from "typeorm";
import { mock } from "jest-mock-extended";
import { BaseRepository } from "./base.repository";
import { AddressTransferRepository } from "./addressTransfer.repository";
import { UnitOfWork } from "../unitOfWork";
import { AddressTransfer } from "../entities";

describe("AddressTransferRepository", () => {
  let repository: AddressTransferRepository;
  let unitOfWorkMock: UnitOfWork;
  let entityManagerMock: EntityManager;
  let queryBuilderMock: SelectQueryBuilder<AddressTransfer>;

  beforeEach(async () => {
    queryBuilderMock = mock<SelectQueryBuilder<AddressTransfer>>({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(10),
    });

    entityManagerMock = mock<EntityManager>({
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    });

    unitOfWorkMock = mock<UnitOfWork>({ getTransactionManager: jest.fn().mockReturnValue(entityManagerMock) });

    const app: TestingModule = await Test.createTestingModule({
      providers: [
        AddressTransferRepository,
        {
          provide: UnitOfWork,
          useValue: unitOfWorkMock,
        },
      ],
    }).compile();

    repository = app.get<AddressTransferRepository>(AddressTransferRepository);
  });

  it("extends BaseRepository<AddressTransfer>", () => {
    expect(repository).toBeInstanceOf(BaseRepository<AddressTransfer>);
  });
  it("should return the count of distinct addresses", async () => {
    const count = await repository.getUawNumber();
    expect(count).toBe(10);
  });
});
