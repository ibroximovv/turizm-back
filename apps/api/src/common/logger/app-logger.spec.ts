import { createAppLogger, resolveLogLevels } from './app-logger';

describe('resolveLogLevels', () => {
  it('enables the threshold and every more severe level', () => {
    expect(resolveLogLevels('warn')).toEqual(['fatal', 'error', 'warn']);
    expect(resolveLogLevels('verbose')).toEqual(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']);
    expect(resolveLogLevels('fatal')).toEqual(['fatal']);
  });

  it('throws on an unknown level', () => {
    expect(() => resolveLogLevels('trace' as never)).toThrow('Unknown log level "trace"');
  });
});

describe('createAppLogger', () => {
  it('only prints enabled levels', () => {
    const logger = createAppLogger({ LOG_LEVEL: 'warn', LOG_FORMAT: 'pretty', LOG_COLORS: false });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    logger.debug('hidden');
    logger.log('hidden');
    logger.warn('shown');

    const written = [...stdout.mock.calls, ...stderr.mock.calls].map(([chunk]) => String(chunk)).join('');
    stdout.mockRestore();
    stderr.mockRestore();
    expect(written).toContain('shown');
    expect(written).not.toContain('hidden');
  });

  it('writes JSON lines when LOG_FORMAT=json', () => {
    const logger = createAppLogger({ LOG_LEVEL: 'log', LOG_FORMAT: 'json', LOG_COLORS: true });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    logger.log('hello', 'Ctx');

    const line = String(stdout.mock.calls[0]?.[0] ?? '');
    stdout.mockRestore();
    expect(JSON.parse(line)).toMatchObject({ level: 'log', message: 'hello', context: 'Ctx' });
  });
});
