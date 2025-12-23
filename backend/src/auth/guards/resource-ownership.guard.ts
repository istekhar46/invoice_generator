import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { RESOURCE_OWNERSHIP_KEY, ResourceOwnershipConfig } from '../decorators/resource-ownership.decorator';

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<ResourceOwnershipConfig>(
      RESOURCE_OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true; // No resource ownership check required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params[config.param];

    if (!user || !resourceId) {
      return true; // Let other guards handle authentication
    }

    const userField = config.userField || 'userId';

    try {
      const resource = await this.findResource(config.entity, resourceId);
      
      if (!resource) {
        throw new NotFoundException(`${config.entity} not found`);
      }

      if (resource[userField] !== user.id) {
        throw new ForbiddenException(
          `Access denied: You don't have permission to access this ${config.entity}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      // For any other database errors, deny access
      throw new ForbiddenException('Access denied');
    }
  }

  private async findResource(entity: string, id: string): Promise<any> {
    switch (entity) {
      case 'customer':
        return await this.prisma.customer.findUnique({
          where: { id },
          select: { id: true, userId: true },
        });
      case 'invoice':
        return await this.prisma.invoice.findUnique({
          where: { id },
          select: { id: true, userId: true },
        });
      case 'companyProfile':
        return await this.prisma.companyProfile.findUnique({
          where: { id },
          select: { id: true, userId: true },
        });
      default:
        throw new Error(`Unsupported entity type: ${entity}`);
    }
  }
}