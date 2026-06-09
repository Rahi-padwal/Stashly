import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    return this.prisma.collection.create({ data: { userId, name } });
  }

  async list(userId: string) {
    const cols = await this.prisma.collection.findMany({
      where: { userId },
      include: { _count: { select: { links: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return cols.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      linkCount: c._count.links,
    }));
  }

  async delete(userId: string, collectionId: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!col) throw new NotFoundException('Collection not found');
    if (col.userId !== userId) throw new ForbiddenException();
    return this.prisma.collection.delete({ where: { id: collectionId } });
  }

  async getLinks(userId: string, collectionId: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!col) throw new NotFoundException('Collection not found');
    if (col.userId !== userId) throw new ForbiddenException();

    const entries = await this.prisma.linkCollection.findMany({
      where: { collectionId },
      include: { link: true },
      orderBy: { addedAt: 'desc' },
    });
    return { collection: { id: col.id, name: col.name }, links: entries.map((e) => e.link) };
  }

  async addLink(userId: string, collectionId: string, linkId: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!col) throw new NotFoundException('Collection not found');
    if (col.userId !== userId) throw new ForbiddenException();

    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Link not found');
    if (link.userId !== userId) throw new ForbiddenException();

    return this.prisma.linkCollection.upsert({
      where: { linkId_collectionId: { linkId, collectionId } },
      create: { linkId, collectionId },
      update: {},
    });
  }

  async removeLink(userId: string, collectionId: string, linkId: string) {
    const col = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });
    if (!col) throw new NotFoundException('Collection not found');
    if (col.userId !== userId) throw new ForbiddenException();

    return this.prisma.linkCollection.delete({
      where: { linkId_collectionId: { linkId, collectionId } },
    });
  }
}
