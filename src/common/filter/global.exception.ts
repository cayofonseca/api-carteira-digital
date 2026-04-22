import {
  ExceptionFilter,
  ArgumentsHost,
  Catch,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError, TypeORMError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado no servidor.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof TypeORMError) {
      if (exception instanceof QueryFailedError) {
        if ((exception as any).code === '23505') {
          status = HttpStatus.CONFLICT;
          message = 'Este registro já existe e não pode ser duplicado.';
        } else {
          message = 'Erro na operação do banco de dados.';
        }
      }
      console.error('Erro no banco de dados:', exception.message);
    } else {
      console.error('Erro não tratado:', exception);
    }

    return response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
