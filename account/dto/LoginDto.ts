import { SubmitSelfServiceLoginFlowWithPasswordMethodBody } from '@ory/client';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @IsString()
    // @IsNotEmpty()
    readonly flow: string;

    readonly data: SubmitSelfServiceLoginFlowWithPasswordMethodBody; //csrf_token, identifier, method,password,password_identifier
}
