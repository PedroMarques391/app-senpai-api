import { ObjectId } from "mongodb";

export class MongoUtils {
  static toObjectId(
    id: string | ObjectId,
    errorMessage = "ID inválido",
  ): ObjectId {
    if (!id) throw new Error(errorMessage);
    if (typeof id === "string") {
      if (!ObjectId.isValid(id)) throw new Error(errorMessage);
      return new ObjectId(id);
    }
    return id;
  }
}
