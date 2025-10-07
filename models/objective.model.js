import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Objective = sequelize.define(
  "Objective",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: "Objective title cannot be empty",
        },
      },
    },
  },
  {
    timestamps: false,
    tableName: "objectives",
  }
);

export default Objective;
