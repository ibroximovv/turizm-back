import { Controller, type INestApplication, Injectable, Module, NotFoundException } from '@nestjs/common';
import { APP_FILTER, RouterModule } from '@nestjs/core';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import axios, { type AxiosInstance } from 'axios';
import { IsString, MinLength } from 'class-validator';
import type { AddressInfo } from 'node:net';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { createValidationPipe } from '../pipes/validation';
import { createCrudController } from './base.controller';
import { BaseService } from './base.service';

class CreateItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;
}
class UpdateItemDto extends PartialType(CreateItemDto) {}
class ItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
}

@Injectable()
class ItemsService extends BaseService<ItemDto, CreateItemDto, UpdateItemDto> {
  protected readonly entityName = 'Item';
  constructor() {
    super({
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    });
  }
}

@Controller()
class ItemsController extends createCrudController<CreateItemDto, UpdateItemDto, ItemDto>({
  name: 'item',
  createDto: CreateItemDto,
  updateDto: UpdateItemDto,
  responseDto: ItemDto,
}) {
  constructor(protected readonly service: ItemsService) {
    super();
  }
}

@Module({ controllers: [ItemsController], providers: [ItemsService] })
class ItemsModule {}

describe('createCrudController', () => {
  let app: INestApplication;
  let http: AxiosInstance;
  let service: ItemsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ItemsModule, RouterModule.register([{ path: 'v1/items', module: ItemsModule }])],
      providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createValidationPipe());
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    http = axios.create({ baseURL: `http://127.0.0.1:${port}/api/v1/items`, validateStatus: () => true });
    service = app.get(ItemsService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => jest.restoreAllMocks());

  it('GET / passes the parsed pagination query to the service', async () => {
    const page = { data: [], meta: { page: 2, limit: 5, total: 0, totalPages: 0, hasNext: false, hasPrev: true } };
    const spy = jest.spyOn(service, 'findAll').mockResolvedValue(page);

    const res = await http.get('/', { params: { page: '2', limit: '5' } });

    expect(res.status).toBe(200);
    expect(res.data).toEqual(page);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 5, sortOrder: 'desc' }));
  });

  it('GET / rejects an invalid query', async () => {
    const res = await http.get('/', { params: { limit: '1000' } });
    expect(res.status).toBe(400);
  });

  it('GET /:id parses the id as an integer', async () => {
    const spy = jest.spyOn(service, 'findOne').mockResolvedValue({ id: 5, name: 'Khiva' });
    const res = await http.get('/5');
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(5);
  });

  it('GET /:id returns 400 for a non-numeric id', async () => {
    const res = await http.get('/abc');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns the shared error shape on 404', async () => {
    jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException('Item #9 not found'));
    const res = await http.get('/9');
    expect(res.status).toBe(404);
    expect(res.data).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Item #9 not found',
      path: '/api/v1/items/9',
    });
  });

  it('POST / validates the body against createDto', async () => {
    const spy = jest.spyOn(service, 'create');
    const res = await http.post('/', { name: 'x', extra: true });

    expect(res.status).toBe(400);
    expect(res.data.message).toEqual(
      expect.arrayContaining(['property extra should not exist', 'name must be longer than or equal to 2 characters']),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('POST / creates with 201', async () => {
    const spy = jest.spyOn(service, 'create').mockResolvedValue({ id: 1, name: 'Khiva' });
    const res = await http.post('/', { name: 'Khiva' });
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledWith({ name: 'Khiva' });
    expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(CreateItemDto);
  });

  it('PATCH /:id validates against updateDto (all fields optional)', async () => {
    const spy = jest.spyOn(service, 'update').mockResolvedValue({ id: 1, name: 'Khiva' });
    const res = await http.patch('/1', {});
    expect(res.status).toBe(200);
    expect(spy).toHaveBeenCalledWith(1, {});
  });

  it('DELETE /:id returns 204', async () => {
    const spy = jest.spyOn(service, 'remove').mockResolvedValue(undefined);
    const res = await http.delete('/1');
    expect(res.status).toBe(204);
    expect(spy).toHaveBeenCalledWith(1);
  });
});
