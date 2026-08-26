/**
 * Tests de la validación del formulario de contacto (spec 012).
 *
 * Existe este archivo porque `CheckoutForm.validate()` no tiene ninguno: vive
 * dentro del componente y no se puede importar. Acá se cubre campo por campo,
 * más los casos que se prometieron en acceptance.md §3.
 */
import { describe, it, expect } from 'vitest';
import { validarConsulta, esValida, TOPES, CONSULTA_MIN } from './contacto.js';

/** Un formulario que pasa. Cada test lo rompe en un solo campo. */
const valido = {
  nombre: 'Juan Pérez',
  email: 'juan@gmail.com',
  telefono: '3416806675',
  ciudad: 'Rosario',
  provincia: 'Santa Fe',
  consulta: 'Quiero 200 calcos con mi logo'
};

describe('validarConsulta — el caso feliz', () => {
  it('no devuelve errores con los seis campos bien', () => {
    expect(validarConsulta(valido)).toEqual({});
    expect(esValida(valido)).toBe(true);
  });

  it('ignora los espacios de más', () => {
    expect(validarConsulta({ ...valido, nombre: '   Juan Pérez   ' })).toEqual({});
  });
});

describe('validarConsulta — los seis campos son obligatorios', () => {
  it('un formulario vacío marca LOS SEIS campos', () => {
    const errores = validarConsulta({});
    expect(Object.keys(errores).sort()).toEqual(
      ['ciudad', 'consulta', 'email', 'nombre', 'provincia', 'telefono']
    );
  });

  it('un formulario sin argumentos no explota', () => {
    expect(() => validarConsulta()).not.toThrow();
  });

  it.each(['nombre', 'email', 'telefono', 'ciudad', 'provincia', 'consulta'])(
    'vaciar %s marca ese campo y ningún otro',
    (campo) => {
      const errores = validarConsulta({ ...valido, [campo]: '' });
      expect(Object.keys(errores)).toEqual([campo]);
    }
  );

  it('un campo con solo espacios cuenta como vacío', () => {
    expect(validarConsulta({ ...valido, ciudad: '    ' })).toHaveProperty('ciudad');
  });
});

describe('validarConsulta — email', () => {
  it.each(['juan@gmail', 'juan.com', '@gmail.com', 'juan @gmail.com'])(
    'rechaza %s',
    (email) => {
      expect(validarConsulta({ ...valido, email })).toHaveProperty('email');
    }
  );

  it('acepta un mail con punto y con +', () => {
    expect(validarConsulta({ ...valido, email: 'juan.perez+web@gmail.com' })).toEqual({});
  });

  it('rechaza un mail que pasa el tope de 254', () => {
    const largo = 'a'.repeat(250) + '@gmail.com';
    expect(validarConsulta({ ...valido, email: largo })).toHaveProperty('email');
  });
});

describe('validarConsulta — teléfono: se valida por dígitos, no por formato', () => {
  it.each([
    '3416806675',
    '+54 9 341 680-6675',
    '341 680 6675',
    '(341) 680-6675',
    '0341 15 680 6675'
  ])('acepta %s', (telefono) => {
    expect(validarConsulta({ ...valido, telefono })).toEqual({});
  });

  it.each(['1234', '341', 'no tengo'])('rechaza %s por incompleto', (telefono) => {
    expect(validarConsulta({ ...valido, telefono })).toHaveProperty('telefono');
  });

  it('rechaza un teléfono que pasa el tope aunque tenga dígitos de sobra', () => {
    expect(validarConsulta({ ...valido, telefono: '1'.repeat(TOPES.telefono + 1) }))
      .toHaveProperty('telefono');
  });
});

describe('validarConsulta — consulta', () => {
  it('rechaza una consulta demasiado corta', () => {
    expect(validarConsulta({ ...valido, consulta: 'hola' })).toHaveProperty('consulta');
  });

  it(`acepta una consulta de exactamente ${CONSULTA_MIN} caracteres`, () => {
    expect(validarConsulta({ ...valido, consulta: 'a'.repeat(CONSULTA_MIN) })).toEqual({});
  });

  it('acepta una consulta de exactamente el tope', () => {
    expect(validarConsulta({ ...valido, consulta: 'a'.repeat(TOPES.consulta) })).toEqual({});
  });

  it('rechaza una consulta que pasa el tope por uno', () => {
    expect(validarConsulta({ ...valido, consulta: 'a'.repeat(TOPES.consulta + 1) }))
      .toHaveProperty('consulta');
  });
});

describe('validarConsulta — topes de los campos cortos', () => {
  it.each([
    ['nombre', TOPES.nombre],
    ['ciudad', TOPES.ciudad],
    ['provincia', TOPES.provincia]
  ])('rechaza %s cuando pasa su tope', (campo, tope) => {
    expect(validarConsulta({ ...valido, [campo]: 'a'.repeat(tope + 1) })).toHaveProperty(campo);
  });

  it.each([
    ['nombre', TOPES.nombre],
    ['ciudad', TOPES.ciudad],
    ['provincia', TOPES.provincia]
  ])('acepta %s justo en el tope', (campo, tope) => {
    expect(validarConsulta({ ...valido, [campo]: 'a'.repeat(tope) })).toEqual({});
  });
});

describe('los mensajes de error', () => {
  it('son texto para mostrarle al cliente, no códigos', () => {
    const errores = validarConsulta({});
    for (const mensaje of Object.values(errores)) {
      expect(typeof mensaje).toBe('string');
      expect(mensaje.length).toBeGreaterThan(3);
      expect(mensaje).not.toMatch(/_|error|invalid_/i);
    }
  });
});
