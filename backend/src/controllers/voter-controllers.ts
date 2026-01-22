import { Request, Response } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { votersTable } from "../db/schema";
import { asyncHandler } from "../utils/asyncHandler";


export const createVoter = asyncHandler(
  async (req: Request, res: Response) => {
  try {
    const { voter_id, name, age } = req.body;

    // Validate required fields
    if (!voter_id || !name || age === undefined) {
      return res.status(400).json({
        message: "voter_id, name, and age are required"
      });
    }

    // Validate age is minimum 18 years
    if (typeof age !== 'number' || age < 18) {
      return res.status(422).json({
        message: `invalid age: ${age}, must be 18 or older`
      });
    }

    // Validate voter_id is a positive number
    if (typeof voter_id !== 'number' || voter_id <= 0) {
      return res.status(400).json({
        message: "Voter ID must be a positive number"
      });
    }

    // Check if voter with this ID already exists
    const existingVoter = await db
      .select()
      .from(votersTable)
      .where(eq(votersTable.voter_id, voter_id));

    if (existingVoter.length > 0) {
      return res.status(409).json({
        message: `voter with id: ${voter_id} already exists`
      });
    }

    // Create a new voter
    const newVoter = {
      voter_id,
      name: name.trim(),
      age,
      has_voted: false,
    };

    await db.insert(votersTable).values(newVoter);

    return res.status(218).json({
      voter_id: newVoter.voter_id,
      name: newVoter.name,
      age: newVoter.age,
      has_voted: newVoter.has_voted
    });
  } catch (error) {
    console.error("Error during voter creation:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

export const getVoter = asyncHandler(
  async (req: Request, res: Response) => {
  try {
    const { voter_id } = req.params;

    // Validate voter_id is provided and is a number
    const voterId = parseInt(voter_id);
    if (isNaN(voterId) || voterId <= 0) {
      return res.status(400).json({
        message: "Invalid voter ID"
      });
    }

    // Find voter by ID
    const voter = await db
      .select()
      .from(votersTable)
      .where(eq(votersTable.voter_id, voterId));

    if (voter.length === 0) {
      return res.status(417).json({
        message: `voter with id: ${voterId} was not found`
      });
    }

    return res.status(222).json(voter[0]);
  } catch (error) {
    console.error("Error during voter retrieval:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

export const getAllVoters = asyncHandler(
  async (req: Request, res: Response) => {
  try {
    // Retrieve all voters from the database
    const voters = await db
      .select({
        voter_id: votersTable.voter_id,
        name: votersTable.name,
        age: votersTable.age
      })
      .from(votersTable);

    return res.status(223).json({
      voters: voters
    });
  } catch (error) {
    console.error("Error during voters retrieval:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

export const updateVoter = asyncHandler(
  async (req: Request, res: Response) => {
  try {
    const { voter_id } = req.params;
    const { name, age } = req.body;

    // Validate voter_id is provided and is a number
    const voterId = parseInt(voter_id);
    if (isNaN(voterId) || voterId <= 0) {
      return res.status(400).json({
        message: "Invalid voter ID"
      });
    }

    // Validate required fields
    if (!name || age === undefined) {
      return res.status(400).json({
        message: "name and age are required"
      });
    }

    // Validate age is minimum 18 years
    if (typeof age !== 'number' || age < 18) {
      return res.status(422).json({
        message: `invalid age: ${age}, must be 18 or older`
      });
    }

    // Check if voter exists
    const existingVoter = await db
      .select()
      .from(votersTable)
      .where(eq(votersTable.voter_id, voterId));

    if (existingVoter.length === 0) {
      return res.status(417).json({
        message: `voter with id: ${voterId} was not found`
      });
    }

    // Update the voter
    const updatedData = {
      name: name.trim(),
      age
    };

    await db
      .update(votersTable)
      .set(updatedData)
      .where(eq(votersTable.voter_id, voterId));

    // Get the updated voter to return
    const updatedVoter = await db
      .select()
      .from(votersTable)
      .where(eq(votersTable.voter_id, voterId));

    return res.status(200).json();
  } catch (error) {
    console.error("Error during voter update:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

