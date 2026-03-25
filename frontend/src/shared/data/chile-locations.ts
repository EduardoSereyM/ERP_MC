export interface ChileRegion {
  nombre: string
  ciudades: {
    nombre: string
    comunas: string[]
  }[]
}

export const CHILE_REGIONES: ChileRegion[] = [
  {
    nombre: 'Arica y Parinacota',
    ciudades: [
      { nombre: 'Arica', comunas: ['Arica', 'Camarones'] },
      { nombre: 'Parinacota', comunas: ['Putre', 'General Lagos'] },
    ],
  },
  {
    nombre: 'Tarapacá',
    ciudades: [
      { nombre: 'Iquique', comunas: ['Iquique', 'Alto Hospicio'] },
      { nombre: 'Tamarugal', comunas: ['Camiña', 'Colchane', 'Huara', 'Pica', 'Pozo Almonte'] },
    ],
  },
  {
    nombre: 'Antofagasta',
    ciudades: [
      { nombre: 'Antofagasta', comunas: ['Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal'] },
      { nombre: 'El Loa', comunas: ['Calama', 'Ollagüe', 'San Pedro de Atacama'] },
      { nombre: 'Tocopilla', comunas: ['Tocopilla', 'María Elena'] },
    ],
  },
  {
    nombre: 'Atacama',
    ciudades: [
      { nombre: 'Copiapó', comunas: ['Copiapó', 'Caldera', 'Tierra Amarilla'] },
      { nombre: 'Chañaral', comunas: ['Chañaral', 'Diego de Almagro'] },
      { nombre: 'Huasco', comunas: ['Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco'] },
    ],
  },
  {
    nombre: 'Coquimbo',
    ciudades: [
      { nombre: 'Elqui', comunas: ['La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paihuano', 'Vicuña'] },
      { nombre: 'Choapa', comunas: ['Illapel', 'Canela', 'Los Vilos', 'Salamanca'] },
      { nombre: 'Limarí', comunas: ['Ovalle', 'Combarbalá', 'Monte Patria', 'Punitaqui', 'Río Hurtado'] },
    ],
  },
  {
    nombre: 'Valparaíso',
    ciudades: [
      {
        nombre: 'Valparaíso',
        comunas: ['Valparaíso', 'Casablanca', 'Concón', 'Juan Fernández', 'Puchuncaví', 'Quintero', 'Viña del Mar'],
      },
      { nombre: 'Isla de Pascua', comunas: ['Isla de Pascua'] },
      { nombre: 'Los Andes', comunas: ['Los Andes', 'Calle Larga', 'Rinconada', 'San Esteban'] },
      { nombre: 'Petorca', comunas: ['La Ligua', 'Cabildo', 'Papudo', 'Petorca', 'Zapallar'] },
      { nombre: 'Quillota', comunas: ['Quillota', 'Calera', 'Hijuelas', 'La Cruz', 'Nogales'] },
      { nombre: 'San Antonio', comunas: ['San Antonio', 'Algarrobo', 'Cartagena', 'El Quisco', 'El Tabo', 'Santo Domingo'] },
      {
        nombre: 'San Felipe de Aconcagua',
        comunas: ['San Felipe', 'Catemu', 'Llaillay', 'Panquehue', 'Putaendo', 'Santa María'],
      },
      { nombre: 'Marga Marga', comunas: ['Quilpué', 'Limache', 'Olmué', 'Villa Alemana'] },
    ],
  },
  {
    nombre: 'Metropolitana de Santiago',
    ciudades: [
      {
        nombre: 'Santiago',
        comunas: [
          'Santiago',
          'Cerrillos',
          'Cerro Navia',
          'Conchalí',
          'El Bosque',
          'Estación Central',
          'Huechuraba',
          'Independencia',
          'La Cisterna',
          'La Florida',
          'La Granja',
          'La Pintana',
          'La Reina',
          'Las Condes',
          'Lo Barnechea',
          'Lo Espejo',
          'Lo Prado',
          'Macul',
          'Maipú',
          'Ñuñoa',
          'Pedro Aguirre Cerda',
          'Peñalolén',
          'Providencia',
          'Pudahuel',
          'Quilicura',
          'Quinta Normal',
          'Recoleta',
          'Renca',
          'San Joaquín',
          'San Miguel',
          'San Ramón',
          'Vitacura',
        ],
      },
      { nombre: 'Cordillera', comunas: ['Puente Alto', 'Pirque', 'San José de Maipo'] },
      { nombre: 'Chacabuco', comunas: ['Colina', 'Lampa', 'Til Til'] },
      { nombre: 'Maipo', comunas: ['San Bernardo', 'Buin', 'Calera de Tango', 'Paine'] },
      { nombre: 'Melipilla', comunas: ['Melipilla', 'Alhué', 'Curacaví', 'María Pinto', 'San Pedro'] },
      { nombre: 'Talagante', comunas: ['Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor'] },
    ],
  },
  {
    nombre: "Libertador General Bernardo O'Higgins",
    ciudades: [
      {
        nombre: 'Cachapoal',
        comunas: [
          'Rancagua',
          'Codegua',
          'Coinco',
          'Coltauco',
          'Doñihue',
          'Graneros',
          'Las Cabras',
          'Machalí',
          'Malloa',
          'Mostazal',
          'Olivar',
          'Peumo',
          'Pichidegua',
          'Quinta de Tilcoco',
          'Rengo',
          'Requínoa',
          'San Vicente',
        ],
      },
      { nombre: 'Cardenal Caro', comunas: ['Pichilemu', 'La Estrella', 'Litueche', 'Marchihue', 'Navidad', 'Paredones'] },
      {
        nombre: 'Colchagua',
        comunas: ['San Fernando', 'Chépica', 'Chimbarongo', 'Lolol', 'Nancagua', 'Palmilla', 'Peralillo', 'Placilla', 'Pumanque', 'Santa Cruz'],
      },
    ],
  },
  {
    nombre: 'Maule',
    ciudades: [
      {
        nombre: 'Talca',
        comunas: ['Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue', 'Río Claro', 'San Clemente', 'San Rafael'],
      },
      { nombre: 'Cauquenes', comunas: ['Cauquenes', 'Chanco', 'Pelluhue'] },
      {
        nombre: 'Curicó',
        comunas: ['Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia', 'Teno', 'Vichuquén'],
      },
      {
        nombre: 'Linares',
        comunas: ['Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro', 'San Javier', 'Villa Alegre', 'Yerbas Buenas'],
      },
    ],
  },
  {
    nombre: 'Ñuble',
    ciudades: [
      {
        nombre: 'Diguillín',
        comunas: ['Chillán', 'Bulnes', 'Coihueco', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón', 'San Ignacio', 'Yungay', 'Chillán Viejo'],
      },
      { nombre: 'Itata', comunas: ['Cobquecura', 'Coelemu', 'Ninhue', 'Portezuelo', 'Quirihue', 'Ránquil', 'Treguaco'] },
      { nombre: 'Punilla', comunas: ['San Carlos', 'Ñiquén', 'San Fabián', 'San Nicolás'] },
    ],
  },
  {
    nombre: 'Biobío',
    ciudades: [
      {
        nombre: 'Concepción',
        comunas: [
          'Concepción',
          'Coronel',
          'Chiguayante',
          'Florida',
          'Hualqui',
          'Lota',
          'Penco',
          'San Pedro de la Paz',
          'Santa Juana',
          'Talcahuano',
          'Tomé',
          'Hualpén',
        ],
      },
      { nombre: 'Arauco', comunas: ['Lebu', 'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa'] },
      {
        nombre: 'Biobío',
        comunas: [
          'Los Ángeles',
          'Antuco',
          'Cabrero',
          'Laja',
          'Mulchén',
          'Nacimiento',
          'Negrete',
          'Quilaco',
          'Quilleco',
          'San Rosendo',
          'Santa Bárbara',
          'Tucapel',
          'Yumbel',
          'Alto Biobío',
        ],
      },
    ],
  },
  {
    nombre: 'La Araucanía',
    ciudades: [
      {
        nombre: 'Cautín',
        comunas: [
          'Temuco',
          'Carahue',
          'Cunco',
          'Curarrehue',
          'Freire',
          'Galvarino',
          'Gorbea',
          'Lautaro',
          'Loncoche',
          'Melipeuco',
          'Nueva Imperial',
          'Padre las Casas',
          'Perquenco',
          'Pitrufquén',
          'Pucón',
          'Saavedra',
          'Teodoro Schmidt',
          'Toltén',
          'Vilcún',
          'Villarrica',
          'Cholchol',
        ],
      },
      {
        nombre: 'Malleco',
        comunas: ['Angol', 'Collipulli', 'Curacautín', 'Ercilla', 'Lonquimay', 'Los Sauces', 'Lumaco', 'Purén', 'Renaico', 'Traiguén', 'Victoria'],
      },
    ],
  },
  {
    nombre: 'Los Ríos',
    ciudades: [
      { nombre: 'Valdivia', comunas: ['Valdivia', 'Corral', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli'] },
      { nombre: 'Ranco', comunas: ['La Unión', 'Futrono', 'Lago Ranco', 'Río Bueno'] },
    ],
  },
  {
    nombre: 'Los Lagos',
    ciudades: [
      {
        nombre: 'Llanquihue',
        comunas: ['Puerto Montt', 'Calbuco', 'Cochamó', 'Fresia', 'Frutillar', 'Los Muermos', 'Llanquihue', 'Maullín', 'Puerto Varas'],
      },
      {
        nombre: 'Chiloé',
        comunas: ['Castro', 'Ancud', 'Chonchi', 'Curaco de Vélez', 'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quemchi', 'Quinchao'],
      },
      {
        nombre: 'Osorno',
        comunas: ['Osorno', 'Puerto Octay', 'Purranque', 'Puyehue', 'Río Negro', 'San Juan de la Costa', 'San Pablo'],
      },
      { nombre: 'Palena', comunas: ['Chaitén', 'Futaleufú', 'Hualaihué', 'Palena'] },
    ],
  },
  {
    nombre: 'Aysén del General Carlos Ibáñez del Campo',
    ciudades: [
      { nombre: 'Coyhaique', comunas: ['Coyhaique', 'Lago Verde'] },
      { nombre: 'Aysén', comunas: ['Aysén', 'Cisnes', 'Guaitecas'] },
      { nombre: 'General Carrera', comunas: ['Chile Chico', 'Río Ibáñez'] },
      { nombre: 'Capitán Prat', comunas: ['Cochrane', "O'Higgins", 'Tortel'] },
    ],
  },
  {
    nombre: 'Magallanes y de la Antártica Chilena',
    ciudades: [
      { nombre: 'Magallanes', comunas: ['Punta Arenas', 'Laguna Blanca', 'Río Verde', 'San Gregorio'] },
      { nombre: 'Antártica Chilena', comunas: ['Cabo de Hornos', 'Antártica'] },
      { nombre: 'Tierra del Fuego', comunas: ['Porvenir', 'Primavera', 'Timaukel'] },
      { nombre: 'Última Esperanza', comunas: ['Natales', 'Torres del Paine'] },
    ],
  },
]
