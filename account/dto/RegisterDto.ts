import { SubmitSelfServiceRegistrationFlowWithPasswordMethodBody } from '@ory/client';
import { IsEmail, IsString } from 'class-validator';
// cardId: number;
export class RegisterDto {
    @IsString()
    readonly flowId: string;

    readonly data: SubmitSelfServiceRegistrationFlowWithPasswordMethodBody;

    readonly myData: {
        referrerCode: number;
    }; //mã ng giới thiệu
}
