import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('collections')
@UseGuards(JwtAuthGuard)
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  create(@Body('name') name: string, @Request() req: any) {
    return this.collectionsService.create(req.user.userId, name);
  }

  @Get()
  list(@Request() req: any) {
    return this.collectionsService.list(req.user.userId);
  }

  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    return this.collectionsService.delete(req.user.userId, id);
  }

  @Get(':id/links')
  getLinks(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ) {
    return this.collectionsService.getLinks(req.user.userId, id);
  }

  @Post(':id/links')
  addLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body('linkId') linkId: string,
    @Request() req: any,
  ) {
    return this.collectionsService.addLink(req.user.userId, id, linkId);
  }

  @Delete(':id/links/:linkId')
  removeLink(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('linkId', new ParseUUIDPipe()) linkId: string,
    @Request() req: any,
  ) {
    return this.collectionsService.removeLink(req.user.userId, id, linkId);
  }
}
