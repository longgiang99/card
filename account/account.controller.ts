import {
    Body,
    Controller,
    forwardRef,
    Get,
    HttpException,
    HttpStatus,
    Inject,
    Param,
    Post,
    Req,
    Query,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { Request } from 'express';
import { ResponseDto } from 'src/shared/dto/responseDto';
import { HelperService } from 'src/shared/services/helper.service';
import { KratosService } from 'src/shared/services/kratos.service';
import { DataSource } from 'typeorm';
import { CardService } from '../card/card.service';
import { ReferralService } from '../referral/referral.service';
import { SecondaryTransactionService } from '../secondary-transaction/secondary-transaction.service';
import {
    TransactionSourceType,
    TransactionStatusEnum,
    TransactionTargetType,
    TransactionTypeEnum,
} from '../transaction/transaction.entity';
import { TransactionService } from '../transaction/transaction.service';
import { AccountEntity } from './account.entity';
import { AccountService } from './account.service';
import { RegisterDto } from './dto/RegisterDto';
import { LoginDto } from './dto/LoginDto';

@Controller('account')
export class AccountController {
    constructor(
        private readonly accountService: AccountService,
        private readonly kratosService: KratosService,
        private readonly cardService: CardService,
        private readonly transactionService: TransactionService,
        private readonly dataSource: DataSource,
        private readonly helperService: HelperService,
        // @Inject(forwardRef(() => ReferralService))
        private readonly referralService: ReferralService,
        private readonly secondaryTransactionService: SecondaryTransactionService,
    ) {}

    //NOTE GET ALL ACCOUNT
    @Get()
    getAccounts(): Promise<AccountEntity[]> {
        return this.accountService.findAll();
    }

    //NOTE gửi fcm đến tất cả ng dùng
    @Post('/fcmsend')
    async fcmNotificationToAll(
        @Body() notificationData: { title: string; body: string },
    ) {
        const { title, body } = notificationData;

        try {
            // Lấy tất cả các tài khoản từ cơ sở dữ liệu
            const allAccounts = await this.accountService.findAll();

            if (allAccounts && allAccounts.length > 0) {
                // Lặp qua từng tài khoản và gửi thông báo FCM
                for (const account of allAccounts) {
                    if (account.token) {
                        await this.accountService.sendFcmNotification(
                            account.token,
                            title,
                            body,
                        );
                        console.log(
                            `FCM gửi thành công cho tài khoản ${account.id}`,
                        );
                    } else {
                        console.log(
                            `Không có token cho tài khoản ${account.id}`,
                        );
                    }
                }
                return { message: 'FCM gửi thành công cho tất cả người dùng' };
            } else {
                console.log('Không có tài khoản nào trong cơ sở dữ liệu');
                return {
                    message: 'Không có tài khoản nào trong cơ sở dữ liệu',
                };
            }
        } catch (error) {
            // Xử lý lỗi khi không thể gửi thông báo FCM.
            console.log('FCM gửi không thành công Error');
            return { message: 'FCM gửi không thành công Error' };
        }
    }

    //[x]
    @Post('/fcmsend/:id')
    async fcmNotification(@Param('id') id: number) {
        const title = 'Thông báo SmartCard có phiên bản mới nhất';
        const body =
            'Vui lòng cập nhật ứng dụng SmartCard lên phiên bản mới trong Google Play';

        try {
            const account = await this.accountService.findByAccountId(id);

            console.log('account token', account.token);
            if (account && account.token) {
                await this.accountService.sendFcmNotification(
                    account.token,
                    title,
                    body,
                );
                // Xử lý khi thông báo FCM đã được gửi thành công.
                console.log('FCM gửi thành công');
                return { message: 'FCM gửi thành công' };
            } else {
                // Xử lý khi không tìm thấy tài khoản hoặc không có token.
                console.log('Không tìm thấy tài khoản hoặc không có token');
                return {
                    message: 'Không tìm thấy tài khoản hoặc không có token',
                };
            }
        } catch (error) {
            // Xử lý lỗi khi không thể gửi thông báo FCM.
            console.log('FCM gửi không thành công Error');
            return { message: 'FCM gửi không thành công Error' };
        }
    }

    //NOTE BY TRINH HIEU
    @Get('/check')
    async checkAccount(@Query('id') id: number) {
        // Gọi phương thức xử lý kiểm tra tài khoản từ AccountService
        const account = await this.accountService.checkAccount(id);

        if (!account) {
            throw new HttpException(
                'Mã tài khoản không hợp lệ',
                HttpStatus.BAD_REQUEST,
            );
        }
        if (account) {
            // Trả về thông tin tài khoản nếu tồn tại
            return account;
        } else {
            // Trả về thông báo lỗi nếu tài khoản không tồn tại
            return { message: 'Tài khoản không tồn tại' };
        }
    }

    //NOTE REGISTER tai khoan
    @Post('/register')
    async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
        const cookies = Object.keys(req.cookies).map(
            (key) => `${key}=${req.cookies[key]}`,
        );
        const cookiesString = cookies.join(';');

        // if (!registerDto.myData) {
        //     throw new HttpException(
        //         'Dữ liệu không hợp lệ',
        //         HttpStatus.BAD_REQUEST,
        //     );
        // }
        // console.log('registerDto', registerDto.myData);
        //Mã thẻ, mã ng giới thiệu
        // const { cardId, referrerCode } = registerDto.myData;
        // if (!registerDto.myData) {
        //     throw new HttpException(
        //         'Dữ liệu không hợp lệ',
        //         HttpStatus.BAD_REQUEST,
        //     );
        // }

        const { referrerCode } = registerDto.myData;

        // console.log('referrerCode', referrerCode);

        const refererId = referrerCode ? referrerCode : null;

        if (refererId && isNaN(refererId)) {
            throw new HttpException(
                'Mã giới thiệu không chính xác',
                HttpStatus.BAD_REQUEST,
            );
        }

        let referer = null;

        if (refererId) {
            referer = await this.accountService.findOne(refererId);
            if (!referer) {
                throw new HttpException(
                    'Mã giới thiệu không chính xác',
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        try {
            //NOTE kratos service- truyền về kratos đnagư ký khảon
            const regRes = await this.kratosService.register(
                registerDto.flowId,
                registerDto.data,
                cookiesString,
            );

            const oryId = regRes.data.identity.id;

            const newAccount = await this.accountService.create({
                ory_id: oryId,
                referer,
                email: regRes.data.identity.traits.email,
            });
            console.log('new user id account', newAccount.id);

            // khi đăng ký thành công, chưa thưởng vội

            // if (refererId) {
            //     await this.referralService.rewardCardReferer(
            //         refererId,
            //         newAccount.id,
            //     );
            // }

            // Reward user 300k -> vi phu chi khi la CTV
            // await this.secondaryTransactionService.create({
            //     account_id: newAccount.id,
            //     amount: 300000,
            // });

            //4/03/2024 trinh minh hieu add reward 50k for new user register
            //NOTE Reward user 50K - Register first

            await this.transactionService.create({
                amount: 50000, //NOTE cộng khi ng dùng đăng ký mới
                source_id: 85,
                status: TransactionStatusEnum.SUCCESS,
                target_id: newAccount.id,
                type: TransactionTypeEnum.TRANSFER,
                vendor_id: null,
                order_id: null,
            });

            return new ResponseDto(regRes.data, true);
        } catch (err) {
            if (err.response) {
                if (err.response.data.error) {
                    throw new HttpException(
                        err.response.data.error.message,
                        err.response.data.error.code,
                    );
                } else {
                    throw new HttpException(
                        err.response.data,
                        HttpStatus.BAD_REQUEST,
                    );
                }
                // console.log(err.response.data)
            } else {
                console.log(err);
                throw new Error();
            }
        }
    }

    //NOTE Login tai khoan
    //NOTE Đăng nhập tài khoản
    @Post('/login')
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const cookies = Object.keys(req.cookies).map(
            (key) => `${key}=${req.cookies[key]}`,
        );
        const cookiesString = cookies.join(';');

        console.log('cookiesString', cookiesString);

        try {
            const regRes = await this.kratosService.login(
                loginDto.flow,
                loginDto.data, //identifier, method,password
                cookiesString,
            );

            console.log('data loginDto.flowId', loginDto.flow);
            return new ResponseDto(regRes.data, true);
        } catch (err) {
            if (err.response) {
                if (err.response.data.error) {
                    throw new HttpException(
                        err.response.data.error.message,
                        err.response.data.error.code,
                    );
                } else {
                    throw new HttpException(
                        err.response.data,
                        HttpStatus.BAD_REQUEST,
                    );
                }
            } else {
                console.error(err);
                throw new HttpException(
                    'Internal Server Error',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
            }
        }
    }

    //GET TẦNG GIỚI THIỆU BẢNG ĐIỀU KHIỂN NG DÙNG
    @Get('/get-tree/:referer_id')
    async getTree(@Param('referer_id') referer_id) {
        const referer = await this.accountService.findOne(referer_id);

        if (!referer) {
            throw new HttpException(
                'Mã giới thiệu không chính xác',
                HttpStatus.BAD_REQUEST,
            );
        }
        const ancestors = await this.accountService.getAncestors(referer_id);
        return ancestors;
    }

    //NOTE GET TẦNG GIỚI THIỆU BẢNG ĐIỀU KHIỂN ADMIN
    @Get('/decendants/:account_id')
    async getDecendants(@Param('account_id') _account_id) {
        const account_id = parseInt(_account_id);
        const decendants = await this.accountService.getDescendants(account_id);

        return decendants;
    }
}
