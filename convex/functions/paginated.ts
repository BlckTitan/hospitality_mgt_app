// convex/staffs.ts

import { query } from "../_generated/server";
import { v } from "convex/values";

export const getPaginatedData = query({

  args: { 
    //collection name
    searchTerm: v.optional(v.string()),
    table: v.union(
      v.literal('staffs'),
      v.literal('users'),
    ),
    limit: v.number(), //items per page
    cursor: v.optional(v.string()), //current page cursor
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))), // optional
  },

  handler: async ({ db }, { table, limit, cursor, sortOrder, searchTerm}) => {
    
    try {
      //if we have a searchTerm and a request comes for the staffs document, 
      // search the staffs record for firstname, lastName, employmentStatus, role data, if found, return it
      if ( table === 'staffs' && searchTerm ) {
        const items = await db
          .query('staffs')
          .withSearchIndex('search_staff', (idx) => 
            idx.search('firstName', searchTerm)
          )
          // .filter(q => 
          //   q.or(
          //     // q.eq(q.field('lastName'), searchTerm),
          //     q.eq(q.field('employmentStatus'), searchTerm),
          //     q.eq(q.field('role'), searchTerm),
          //   )
          // )
          .paginate({ numItems: limit, cursor: cursor  ?? null});

          if(items.page.length === 0){
            return { success: false, message: "No matching results were found!", page: null, isDone: null, continueCursor: null};
          }else{
            return items;
          }

      } else {
        // if there is no search request, just return all the data in the database
        const items = await db
          .query(table)
          .order(sortOrder ?? "desc")// respect sortOrder if provided, default to "desc"
          .paginate({ numItems: limit, cursor: cursor  ?? null});// Use convex pagination pattern

        if(items){
          return items;
        }else{
          console.log(items)
          return { success: false, message: "No result found!", page: null, isDone: null, continueCursor: null};
        }

      }
    } catch (error) {

      console.log(`Fetch failed ${error}`)
      return { success: false, message: "Failed to fetch paginated data", page: null, isDone: null, continueCursor: null};

    }
    
  },
    
});