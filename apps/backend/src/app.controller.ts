import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('debug/render-ip')
  async getRenderIp() {
    const response = await fetch('https://ipinfo.io/json');
    return response.json();
  }
}
