import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { HelperService } from 'src/shared/services/helper.service';
import { DataSource, Repository } from 'typeorm';
import { AccountInfoService } from '../account-info/account-info.service';
import { AgencyType } from '../agency/agency.entity';
import { AccountEntity } from './account.entity';
import { CreateAccountDto } from './dto/CreateAccountDto';
import { CardService } from '../card/card.service';
//NOTE BY HIEU
// import { SmartCardRepository } from './account.repository';
import { AxiosResponse } from 'axios';
import * as admin from 'firebase-admin';
import axios from 'axios';

@Injectable()
export class AccountService {
    constructor(
        @InjectRepository(AccountEntity)
        private accountRepository: Repository<AccountEntity>,
        private dataSource: DataSource,
        private accountInfoService: AccountInfoService,
        private cardService: CardService,
        private readonly helperService: HelperService,
        public configService: ConfigService, //NOTE by trinh hieu
    ) {}

    //NOTE MỚI - SEND FCM Notification new update
    async sendFcmNotification(
        deviceToken: string,
        title: string,
        body: string,
    ): Promise<AxiosResponse> {
        const serverKey = `${process.env.FIREBASE_PRIVATE_KEY}`; // Thay thế bằng khóa server
        console.log(serverKey);
        const url = 'https://fcm.googleapis.com/fcm/send';

        const message = {
            to: deviceToken,
            notification: {
                title: title,
                body: body,
            },
        };

        try {
            const response = await axios.post(url, message, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${serverKey}`,
                },
            });

            console.log('Successfully sent FCM notification:', response.data);
            return response;
        } catch (error) {
            console.error(
                'Error sending FCM notification:',
                error.response.data,
            );
            throw error;
        }
    }

    //NOTE GET ALL ACCOUNT LIST
    findAll(): Promise<AccountEntity[]> {
        return this.accountRepository.find();
    }

    //NOTE FIND ONE ACCOUNT BY ID
    async findByAccountId(id: number): Promise<AccountEntity> {
        return this.accountRepository.findOne({ where: { id } });
    }

    //FIND ONE JOIN referer, agency table
    findOne(id: number): Promise<AccountEntity> {
        return this.accountRepository
            .createQueryBuilder('account')
            .where({
                id,
            })
            .leftJoinAndSelect('account.referer', 'referer')
            .leftJoinAndSelect('account.agency', 'agency')
            .getOne();

        // return this.accountRepository.findOneBy({ id });
    }

    findOneByOryId(ory_id: string): Promise<AccountEntity> {
        return (
            this.accountRepository
                .createQueryBuilder('account')
                .where({
                    ory_id,
                })
                // .leftJoinAndSelect('account.referer', 'referer')
                .getOne()
        );

        // return this.accountRepository.findOneBy({ id });
    }

    //PENDING CHECK ID SMARTCARD BY TRINH HIEU
    // async checkAccount(id: number): Promise<AccountEntity | null> {
    //     // Thực hiện truy vấn để kiểm tra tài khoản
    //     const myid = await this.findOne(id);

    //     return myid ? myid : null;
    // }
    // async checkAccount(id: number): Promise<AccountEntity | null> {
    //     // Kiểm tra xem ID tài khoản có khớp với ID người đăng nhập hay không
    //     // const account = await this.accountRepository.findOne(id);
    //     const myid = this.accountRepository.findOneBy({ id });
    //     return myid ? myid : null;
    // }

    //NOTE KIỂM TRA TÀI KHOẢN TỒN TẠI KHÔNG BY ID
    async checkAccount(id: number): Promise<AccountEntity | null> {
        const account = await this.accountRepository.findOneBy({ id });

        if (!account) {
            throw new HttpException(
                'Tài khoản không tồn tại',
                HttpStatus.BAD_REQUEST,
            );
        }

        return account;
    }

    //NOTE REGISTER ACCOUNT FORRM
    async create(createAccountDto: CreateAccountDto): Promise<AccountEntity> {
        const account_info = await this.accountInfoService.create({});

        const account: AccountEntity = AccountEntity.create(); //Tạo tài khoản
        account.ory_id = createAccountDto.ory_id;
        account.email = createAccountDto.email;

        if (createAccountDto.referer) {
            account.referer = createAccountDto.referer;
        }
        account.account_info = account_info;

        await account.save();

        //BY TRINH HIEU ADD
        const card = await this.cardService.create({ account_id: account.id }); // Truyền account_id vào đây
        account.card = card;

        await account.save(); // Lưu lại account sau khi thiết lập trường card

        return account;
    }

    //NOTE DELETE ACCOUNT BY ID
    async remove(id: number): Promise<void> {
        await this.accountRepository.delete(id);
    }

    //Tổ tiên- GET TẦNG GIỚI THEIEUJ BẢNG ĐIỀU KHIỂN NG DÙNG
    async getAncestors(account_id: number): Promise<
        {
            id: number;
            referer_id: number | null;
            email: string;
            agency_id: string;
            join_at: Date;
            type: AgencyType; //Là thành viên - agency
        }[]
    > {
        const referer = await this.findOne(account_id);

        if (!referer) {
            throw new HttpException(
                'Mã giới thiệu không chính xác',
                HttpStatus.BAD_REQUEST,
            );
        }

        //NOTE https://stackoverflow.com/questions/18659992/how-to-select-using-with-recursive-clause
        // this.dataSource.manager.query() truy cập trực tiếp đến EntityManager của TypeORM
        // truy vấn đệ quy with recursive
        const ancestors = await this.dataSource.manager.query(`
        with recursive temp_table as (
            select
                account.id as id,
                account.referer_id as referer_id,
                account.email as email,
                a1.id as agency_id,
                a1.join_at as join_at,
                a1.type as type
            from account
            left join agency a1 on account.id = a1.account_id
            where
                account.id = ${account_id}
            union
                select
                    a.id as id,
                    a.referer_id as referer_id,
                    a.email as email,
                    a2.id as agency_id,
                    a2.join_at as join_at,
                    a2.type as type
                from
                    account a
                left join agency a2 on a.id = a2.account_id
                inner join temp_table s on s.referer_id = a.id
        ) select * from temp_table 
        `);

        return ancestors;
    }

    // WITH RECURSIVE pseudo-entity-name(column-names) AS (
    //     Initial-SELECT
    // UNION ALL
    //     Recursive-SELECT using pseudo-entity-name
    // )
    // Outer-SELECT using pseudo-entity-name

    //Hậu duệ - tang giơi thiệu admin
    async getDescendants(account_id: number): Promise<AccountEntity[]> {
        const account = await this.findOne(account_id);

        if (!account) {
            throw new HttpException(
                'Mã giới thiệu không chính xác',
                HttpStatus.BAD_REQUEST,
            );
        }

        const descendants = await this.dataSource.manager.query(`
        with recursive temp_table as (
            select
                account.id as id,
                account.referer_id as referer_id,
                account.email as email,
                a1.id as agency_id,
                a1.join_at as join_at,
                a1.type as type
            from account
            left join agency a1 on account.id = a1.account_id
            where
                account.id = ${account_id}
            union
                select
                    a.id as id,
                    a.referer_id as referer_id,
                    a.email as email,
                    a2.id as agency_id,
                    a2.join_at as join_at,
                    a2.type as type
                from
                    account a
                left join agency a2 on a.id = a2.account_id
                inner join temp_table s on s.id = a.referer_id
        ) select * from temp_table 
        `);

        console.log(descendants);
        // .getTreeRepository(AccountEntity)
        // .createDescendantsQueryBuilder('account', 'accountClosure', account)
        // .leftJoinAndSelect('account.agency', 'agency')
        // // .orderBy('account.mpath', 'ASC')
        // .getMany();

        // if (descendants.length > 1 && descendants[descendants.length - 1].id === account_id) {
        //     // descendants.splice(descendants.length - 1, 1)
        //     this.helperService.swapArray(descendants, descendants.length - 1, 0);
        // }
        // console.log(descendants)
        return descendants;
    }

    //NOTE Tài khoản root - Phân quyền loại tài khoản như admin, user, agency,...
    async getRootAccount(): Promise<AccountEntity> {
        const rootAccounts = await this.accountRepository
            .createQueryBuilder('account')
            .where('is_root = :is_root', {
                is_root: true,
            })
            // .leftJoinAndSelect('account.vendor', 'vendor')
            .getMany();
        // const rootAccounts = await this.accountRepository.findBy({
        //     is_root: true,
        // });

        if (rootAccounts.length !== 1) {
            throw new HttpException(
                'Hệ thống chỉ được có duy nhất 1 root account',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        const rootAccount = rootAccounts[0];
        return rootAccount;
    }
}
