import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { normalizePhone, RegisterDto } from './register.dto';

function validate(body: object): { dto: RegisterDto; errors: string[] } {
  const dto = plainToInstance(RegisterDto, body);
  const errors = validateSync(dto).flatMap((e) => Object.values(e.constraints ?? {}));
  return { dto, errors };
}

describe('RegisterDto', () => {
  it('normalizes phone, trims name and lowercases email', () => {
    const { dto, errors } = validate({
      fullName: '  Aziz Karimov ',
      phone: '998 (90) 123-45-67',
      email: ' Aziz@Example.COM ',
      password: 'Secret123',
    });
    expect(errors).toEqual([]);
    expect(dto).toMatchObject({ fullName: 'Aziz Karimov', phone: '+998901234567', email: 'aziz@example.com' });
  });

  it('treats an empty email as absent', () => {
    const { dto, errors } = validate({ fullName: 'Aziz', phone: '+998901234567', email: '  ', password: 'Secret123' });
    expect(errors).toEqual([]);
    expect(dto.email).toBeUndefined();
  });

  it('rejects an invalid phone, email and a short password', () => {
    const { errors } = validate({ fullName: 'Aziz', phone: '12', email: 'nope', password: 'short' });
    expect(errors).toEqual(
      expect.arrayContaining([
        'phone must be a valid international phone number, e.g. +998901234567',
        'email must be an email',
        'password must be longer than or equal to 8 characters',
      ]),
    );
  });
});

describe('normalizePhone', () => {
  it('leaves non-strings to the validators', () => {
    expect(normalizePhone(998901234567)).toBe(998901234567);
  });
});
