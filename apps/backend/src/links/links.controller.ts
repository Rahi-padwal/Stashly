import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { SearchLinksDto } from './dto/search-links.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(private readonly linksService: LinksService) {}

  @Post()
  create(@Body() dto: CreateLinkDto, @Request() req: any) {
    const userId = req.user.userId;
    return this.linksService.create({ ...dto, userId });
  }

  @Get()
  getAllLinks(@Request() req: any) {
    const userId = req.user.userId;
    this.logger.debug(`Fetching all links for userId: ${userId}`);
    return this.linksService.getAllLinks(userId);
  }

  @Get('search')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  search(@Query() query: SearchLinksDto, @Request() req: any) {
    const userId = req.user.userId;
    this.logger.debug(`Search query params: ${JSON.stringify(query)}`);
    return this.linksService.semanticSearch(query.q, userId);
  }

  @Delete(':id')
  async deleteLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    this.logger.debug(`Deleting link ${id} for userId: ${userId}`);
    return this.linksService.deleteLink(id, userId);
  }

  @Delete()
  async deleteAllLinks(@Request() req: any) {
    const userId = req.user.userId;
    this.logger.debug(`Deleting all links for userId: ${userId}`);
    return this.linksService.deleteAllLinks(userId);
  }

  @Post('admin/reprocess')
  @UseGuards(AdminGuard)
  async reprocessAllLinks(@Request() req: any) {
    const userId = req.user.userId;
    this.logger.debug(`Reprocessing all links for userId: ${userId}`);
    return this.linksService.reprocessAllLinks(userId);
  }
}
