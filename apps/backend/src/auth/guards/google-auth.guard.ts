import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirectUri =
      typeof req.query?.redirectUri === 'string' ? req.query.redirectUri : undefined;

    if (!redirectUri) {
      return undefined;
    }

    const statePayload = Buffer.from(
      JSON.stringify({ redirectUri }),
      'utf8',
    ).toString('base64url');

    return { state: statePayload };
  }
}
