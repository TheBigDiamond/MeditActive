import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Interval = sequelize.define(
  "Interval",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: {
          msg: "Start date must be a valid date",
        },
      },
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: {
          msg: "End date must be a valid date",
        },
        isAfterStartDate(value) {
          if (new Date(value) <= new Date(this.startDate)) {
            throw new Error("End date must be after start date");
          }
        },
      },
    },
  },
  {
    timestamps: false,
    tableName: "intervals",
  }
);

export default Interval;
