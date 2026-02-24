const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Cotizacion = sequelize.define('Cotizacion', {
  asegurado: { type: DataTypes.STRING, allowNull: true },
  vehiculo: { type: DataTypes.STRING, allowNull: true },
  rutaArchivo: { type: DataTypes.STRING, allowNull: true },
  loteId: { type: DataTypes.STRING, allowNull: true },
  file_md5: { type: DataTypes.STRING(32), allowNull: true },   // Hash MD5 del PDF — usado para caché
  userId: { type: DataTypes.INTEGER, allowNull: true }         // FK al propietario
}, { tableName: 'cotizacions' });


const DetalleCotizacion = sequelize.define('DetalleCotizacion', {
  compania: { type: DataTypes.STRING, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  plan: { type: DataTypes.STRING, allowNull: true },
  // Primas
  prima_uf3: { type: DataTypes.STRING },
  prima_uf5: { type: DataTypes.STRING },
  prima_uf10: { type: DataTypes.STRING },
  // Detalles
  rc_monto: { type: DataTypes.STRING },
  rc_tipo: { type: DataTypes.STRING },
  taller_marca: { type: DataTypes.STRING },
  reposicion_meses: { type: DataTypes.STRING },
  paginas_encontradas: { type: DataTypes.STRING },
  observaciones: { type: DataTypes.TEXT },
  rutaArchivo: { type: DataTypes.STRING }
  // userId no necesario: hereda ownership a través de Cotizacion
}, { tableName: 'detallecotizacions' });

// nombre ya NO es unique global — cada user puede tener su propia empresa "ANS"
const Empresa = sequelize.define('Empresa', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prompt_reglas: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  paginas_procesamiento: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "2"
  },
  userId: { type: DataTypes.INTEGER, allowNull: true }      // FK al propietario
}, { tableName: 'empresas' });

// Parametro: PK es ID auto-increment.
// Unicidad real: (parametro, userId) para permitir que varios users tengan el mismo key 'IA_CONFIG'.
const Parametro = sequelize.define('Parametro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  parametro: {
    type: DataTypes.STRING,
    allowNull: false
  },
  valor: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'parametros',
  indexes: [
    {
      unique: true,
      fields: ['parametro', 'userId']
    }
  ]
});

const CorrectionRule = sequelize.define('CorrectionRule', {
  campo: { type: DataTypes.STRING, allowNull: false },
  valor_incorrecto: { type: DataTypes.STRING, allowNull: false },
  valor_correcto: { type: DataTypes.STRING, allowNull: false },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  userId: { type: DataTypes.INTEGER, allowNull: true }  // FK al propietario
}, { tableName: 'correction_rules' });

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: { type: DataTypes.STRING, allowNull: true },
  displayName: { type: DataTypes.STRING, allowNull: true },
  googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
  authProvider: { type: DataTypes.STRING, defaultValue: 'local' },
  role: { type: DataTypes.STRING, defaultValue: 'user' }
}, { tableName: 'users' });

// ── Relaciones ──────────────────────────────────────────────
// Cotizacion <-> DetallesCotizacion
Cotizacion.hasMany(DetalleCotizacion, { as: 'detalles' });
DetalleCotizacion.belongsTo(Cotizacion);

// Empresa <-> CorrectionRule
Empresa.hasMany(CorrectionRule, { foreignKey: 'empresa_id' });
CorrectionRule.belongsTo(Empresa, { foreignKey: 'empresa_id' });

// User -> tablas con datos propios del usuario
User.hasMany(Cotizacion, { foreignKey: 'userId' });
User.hasMany(Empresa, { foreignKey: 'userId' });
User.hasMany(Parametro, { foreignKey: 'userId' });
User.hasMany(CorrectionRule, { foreignKey: 'userId' });

Cotizacion.belongsTo(User, { foreignKey: 'userId' });
Empresa.belongsTo(User, { foreignKey: 'userId' });
Parametro.belongsTo(User, { foreignKey: 'userId' });
CorrectionRule.belongsTo(User, { foreignKey: 'userId' });

module.exports = { Cotizacion, DetalleCotizacion, Empresa, Parametro, CorrectionRule, User };
