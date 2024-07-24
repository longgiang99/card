import { IsEmail, IsNumber, IsUUID } from 'class-validator';
import { AccountEntity } from '../account.entity';

export class CreateAccountDto {
    @IsUUID()
    ory_id: string;

    referer?: AccountEntity; ///NG giới thiệu

    @IsEmail()
    email: string;
}
