const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Cotizacion = sequelize.define('Cotizacion', {
  asegurado: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vehiculo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rutaArchivo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  loteId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, { tableName: 'cotizacions' });

const DetalleCotizacion = sequelize.define('DetalleCotizacion', {
  compania: {
    type: DataTypes.STRING,
    allowNull: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  plan: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Primas
  prima_uf3: { type: DataTypes.STRING },
  prima_uf5: { type: DataTypes.STRING },
  prima_uf10: { type: DataTypes.STRING },

  // Detalles
  rc_monto: { type: DataTypes.STRING },
  rc_tipo: { type: DataTypes.STRING },
  taller_marca: { type: DataTypes.STRING },
  reposicion_meses: { type: DataTypes.STRING },
  observaciones: { type: DataTypes.TEXT },
  rutaArchivo: { type: DataTypes.STRING }
}, { tableName: 'detallecotizacions' });

const Empresa = sequelize.define('Empresa', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  prompt_reglas: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  paginas_procesamiento: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  }
}, { tableName: 'empresas' });

const Parametro = sequelize.define('Parametro', {
  parametro: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, { tableName: 'parametros' });

// Relación 1 a N
Cotizacion.hasMany(DetalleCotizacion, { as: 'detalles' });
DetalleCotizacion.belongsTo(Cotizacion);

module.exports = { Cotizacion, DetalleCotizacion, Empresa, Parametro };
