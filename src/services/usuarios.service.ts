// src/services/usuarios.service.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

export async function listarUsuarios(empresaId: string) {
  return prisma.usuario.findMany({
    where: { empresaId },
    select: {
      id: true, email: true, nombre: true, apellidos: true,
      rol: true, activo: true, telefono: true, zona: true,
      objetivoMensual: true, createdAt: true,
    },
    orderBy: { nombre: 'asc' },
  });
}

export async function crearUsuario(input: {
  email: string; nombre: string; apellidos?: string;
  password: string; rol: string; telefono?: string;
  zona?: string; objetivoMensual?: number; empresaId: string;
}) {
  const existe = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existe) throw new Error('Ya existe un usuario con ese email');
  const hash = await bcrypt.hash(input.password, 12);
  const usuario = await prisma.usuario.create({
    data: {
      email: input.email.toLowerCase(),
      nombre: input.nombre,
      apellidos: input.apellidos || '',
      passwordHash: hash,
      rol: input.rol as any,
      activo: true,
      telefono: input.telefono,
      zona: input.zona,
      objetivoMensual: input.objetivoMensual,
      empresaId: input.empresaId,
    },
  });
  logger.info('usuario_creado', { id: usuario.id, email: input.email, rol: input.rol, empresaId: input.empresaId });
  return usuario;
}

export async function actualizarUsuario(id: string, empresaId: string, input: {
  nombre?: string; apellidos?: string; rol?: string;
  activo?: boolean; telefono?: string; zona?: string;
  objetivoMensual?: number; password?: string;
}) {
  // Verificar que el usuario pertenece a la empresa
  const usuario = await prisma.usuario.findFirst({ where: { id, empresaId } });
  if (!usuario) throw new Error('Usuario no encontrado');

  const data: any = { ...input };
  delete data.password;
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }
  if (input.rol) data.rol = input.rol as any;
  const actualizado = await prisma.usuario.update({ where: { id }, data });
  logger.info('usuario_actualizado', { id, empresaId, campos: Object.keys(input) });
  return actualizado;
}
