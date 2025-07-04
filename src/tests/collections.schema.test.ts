import { describe, it, expect } from 'vitest'
import { 
  insertCollectionSchema, 
  selectCollectionSchema,
  collections 
} from '../db/schema'
import { collectionSchema } from '../schemas'

describe('Collections Schema Validation', () => {
  describe('Database Schema', () => {
    describe('insertCollectionSchema', () => {
      it('should validate valid collection data', () => {
        const validCollection = {
          id: 'test-collection-id',
          name: 'test_collection',
          displayName: 'Test Collection',
          description: 'A test collection',
          schema: { type: 'object', properties: {} },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = insertCollectionSchema.safeParse(validCollection)
        expect(result.success).toBe(true)
      })

      it('should require name field', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          displayName: 'Test Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['name'],
                code: 'invalid_type'
              })
            ])
          )
        }
      })

      it('should require displayName field', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          name: 'test_collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['displayName'],
                code: 'invalid_type'
              })
            ])
          )
        }
      })

      it('should validate name format with underscores only', () => {
        const validCollection = {
          id: 'test-collection-id',
          name: 'valid_collection_name_123',
          displayName: 'Valid Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(validCollection)
        expect(result.success).toBe(true)
      })

      it('should reject invalid name format with spaces', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          name: 'invalid collection name',
          displayName: 'Invalid Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['name'],
                code: 'invalid_format'
              })
            ])
          )
        }
      })

      it('should reject invalid name format with uppercase', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          name: 'InvalidCollection',
          displayName: 'Invalid Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
      })

      it('should reject invalid name format with special characters', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          name: 'invalid@collection#name',
          displayName: 'Invalid Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
      })

      it('should require minimum display name length', () => {
        const invalidCollection = {
          id: 'test-collection-id',
          name: 'test_collection',
          displayName: '',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(invalidCollection)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['displayName'],
                code: 'too_small'
              })
            ])
          )
        }
      })

      it('should allow optional description', () => {
        const collectionWithoutDescription = {
          id: 'test-collection-id',
          name: 'test_collection',
          displayName: 'Test Collection',
          schema: { type: 'object', properties: {} }
        }

        const result = insertCollectionSchema.safeParse(collectionWithoutDescription)
        expect(result.success).toBe(true)
      })

      it('should accept isActive when provided', () => {
        const collection = {
          id: 'test-collection-id',
          name: 'test_collection',
          displayName: 'Test Collection',
          schema: { type: 'object', properties: {} },
          isActive: true
        }

        const result = insertCollectionSchema.safeParse(collection)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.isActive).toBe(true)
        }
      })
    })

    describe('selectCollectionSchema', () => {
      it('should validate complete collection data from database', () => {
        const dbCollection = {
          id: 'test-collection-id',
          name: 'test_collection',
          displayName: 'Test Collection',
          description: 'A test collection',
          schema: { type: 'object', properties: {} },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const result = selectCollectionSchema.safeParse(dbCollection)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('API Schema Validation', () => {
    describe('collectionSchema', () => {
      it('should validate valid collection API input', () => {
        const validInput = {
          name: 'test_collection',
          displayName: 'Test Collection',
          description: 'A test collection'
        }

        const result = collectionSchema.safeParse(validInput)
        expect(result.success).toBe(true)
      })

      it('should validate collection name format for API', () => {
        const validInputs = [
          { name: 'simple', displayName: 'Simple' },
          { name: 'with_underscore', displayName: 'With Underscore' },
          { name: 'with-dash', displayName: 'With Dash' },
          { name: 'with123numbers', displayName: 'With Numbers' },
          { name: 'complex_name-with123_all', displayName: 'Complex Name' }
        ]

        validInputs.forEach(input => {
          const result = collectionSchema.safeParse(input)
          expect(result.success).toBe(true)
        })
      })

      it('should reject invalid collection names for API', () => {
        const invalidInputs = [
          { name: 'With Spaces', displayName: 'Invalid' },
          { name: 'WithCamelCase', displayName: 'Invalid' },
          { name: 'with@special', displayName: 'Invalid' },
          { name: 'with.dots', displayName: 'Invalid' },
          { name: 'with/slash', displayName: 'Invalid' },
          { name: '', displayName: 'Empty Name' }
        ]

        invalidInputs.forEach(input => {
          const result = collectionSchema.safeParse(input)
          expect(result.success).toBe(false)
        })
      })

      it('should require display name', () => {
        const invalidInput = {
          name: 'test_collection'
        }

        const result = collectionSchema.safeParse(invalidInput)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                path: ['displayName'],
                code: 'invalid_type'
              })
            ])
          )
        }
      })

      it('should allow optional description in API', () => {
        const validInput = {
          name: 'test_collection',
          displayName: 'Test Collection'
        }

        const result = collectionSchema.safeParse(validInput)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Schema JSON Validation', () => {
    it('should handle complex JSON schema objects', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title', required: true },
          content: { type: 'string', title: 'Content', format: 'richtext' },
          tags: { type: 'array', items: { type: 'string' } },
          metadata: {
            type: 'object',
            properties: {
              seo: { type: 'string' },
              featured: { type: 'boolean' }
            }
          }
        },
        required: ['title']
      }

      const collection = {
        id: 'test-collection-id',
        name: 'test_collection',
        displayName: 'Test Collection',
        schema: complexSchema
      }

      const result = insertCollectionSchema.safeParse(collection)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.schema).toEqual(complexSchema)
      }
    })

    it('should handle empty schema object', () => {
      const collection = {
        id: 'test-collection-id',
        name: 'test_collection',
        displayName: 'Test Collection',
        schema: {}
      }

      const result = insertCollectionSchema.safeParse(collection)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long valid names', () => {
      const longName = 'a'.repeat(50) + '_collection'
      const collection = {
        id: 'test-collection-id',
        name: longName,
        displayName: 'Long Name Collection',
        schema: { type: 'object' }
      }

      const result = insertCollectionSchema.safeParse(collection)
      expect(result.success).toBe(true)
    })

    it('should handle very long display names', () => {
      const longDisplayName = 'A Very Long Display Name '.repeat(10)
      const collection = {
        id: 'test-collection-id',
        name: 'test_collection',
        displayName: longDisplayName,
        schema: { type: 'object' }
      }

      const result = insertCollectionSchema.safeParse(collection)
      expect(result.success).toBe(true)
    })

    it('should handle null values appropriately', () => {
      const collection = {
        id: 'test-collection-id',
        name: 'test_collection',
        displayName: 'Test Collection',
        description: null,
        schema: { type: 'object' }
      }

      const result = insertCollectionSchema.safeParse(collection)
      expect(result.success).toBe(true)
    })
  })
})