// src/services/usuarios.service.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

export async function listarUsuarios() {
  return prisma.usuario.findMany({
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
  zona?: string; objetivoMensual?: number;
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
    },
  });

  logger.info('usuario_creado', { id: usuario.id, email: input.email, rol: input.rol });
  return usuario;
}

export async function actualizarUsuario(id: string, input: {
  nombre?: string; apellidos?: string; rol?: string;
  activo?: boolean; telefono?: string; zona?: string;
  objetivoMensual?: number; password?: string;
}) {
  const data: any = { ...input };
  delete data.password;

  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }
  if (input.rol) data.rol = input.rol as any;

  const usuario = await prisma.usuario.update({ where: { id }, data });
  logger.info('usuario_actualizado', { id, campos: Object.keys(input) });
  return usuario;
}
