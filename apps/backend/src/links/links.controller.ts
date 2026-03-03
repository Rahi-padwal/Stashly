import { Body, Controller, Get, Logger, Post, Query, UseGuards, Request } from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { SearchLinksDto } from './dto/search-links.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
  search(@Query() query: SearchLinksDto, @Request() req: any) {
    const userId = req.user.userId;
    this.logger.debug(`Search query params: ${JSON.stringify(query)}`);
    return this.linksService.semanticSearch(query.q, userId);
  }
}
