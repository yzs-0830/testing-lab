import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { serverOf } from '../src/server'
import * as TodoRepo from '../src/repo/todo'
import { FastifyInstance } from 'fastify'
import { Todo, TodoBody } from '../src/types/todo'

describe('Todo API Testing', () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = serverOf()
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('When receive a GET /api/v1/todos request, Then it should response an array of todos', async () => {
    // arrange: mock the repo function to return an array of todos
    const todos: Array<Todo> = [
      {
        id: '1',
        name: 'todo 1',
        description: 'description 1',
        status: false
      },
      {
        id: '2',
        name: 'todo 2',
        description: 'description 2',
        status: true
      }
    ]
    // Mock findAllTodos get all todos from database
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => todos)

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an array of todos
    const result = JSON.parse(response.body)['todos']
    expect(result).toStrictEqual(todos)
  })

  test('Given an empty array return from repo function, When receive a GET /api/v1/todos request, Then it should response an empty array', async () => {
    // arrange: mock the repo function to return an empty array
    vi.spyOn(TodoRepo, 'findAllTodos').mockImplementation(async () => [])

    // act: receive a GET /api/v1/todos request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })

    // assert: response should be an empty array
    const todos = JSON.parse(response.body)['todos']
    expect(todos).toStrictEqual([])
  })

  test('Given a valid ID and status, When receive a PUT /api/v1/todos/:id request, Then it should response the updated todo object', async () => {
    // arrange: mock the repo function to return an updated todo object
    const updatedTodo: Todo = {
      id: '1',
      name: 'todo 1',
      description: 'description 1',
      status: true
    }

    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => updatedTodo)

    // act: receive a PUT /api/v1/todos/:id request
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/1',
      payload: {
        status: true
      }
    })

    // assert: response should be the updated todo object
    expect(response.statusCode).toBe(200)
    const result = JSON.parse(response.body)['todo']
    expect(result).toStrictEqual(updatedTodo)
  })

  test('Given an invalid ID, When receive a PUT /api/v1/todos/:id request, Then it should response with status code 404', async () => {
    // arrange: mock the repo function to return null
    vi.spyOn(TodoRepo, 'updateTodoById').mockImplementation(async () => null)

    // act: receive a PUT /api/v1/todos/:id request
    const response = await server.inject({
      method: 'PUT',
      url: '/api/v1/todos/invalid-id',
      payload: {
        status: true
      }
    })

    // assert: response should with status code 404
    expect(response.statusCode).toBe(404)
    const result = JSON.parse(response.body)
    expect(result).toEqual({ msg: 'Not Found Todo:invalid-id' })
  })

  test('Given a create->get->delete->get flow, When API requests are executed in sequence, Then it should return a created todo, then list it, then delete it, then return empty list', async () => {
    const newTodo: Todo = {
      id: '3',
      name: 'todo 3',
      description: 'description 3',
      status: false
    }

    vi.spyOn(TodoRepo, 'createTodo').mockImplementation(async () => newTodo)
    vi.spyOn(TodoRepo, 'findAllTodos')
      .mockImplementationOnce(async () => [newTodo])
      .mockImplementationOnce(async () => [])
    vi.spyOn(TodoRepo, 'deleteTodoById').mockImplementation(async () => ({ value: newTodo, ok: 1 } as any))

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/todos',
      payload: {
        name: newTodo.name,
        description: newTodo.description
      }
    })
    expect(createResponse.statusCode).toBe(201)
    expect(JSON.parse(createResponse.body)).toStrictEqual({ todo: newTodo })

    const listResponseAfterCreate = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })
    expect(listResponseAfterCreate.statusCode).toBe(200)
    expect(JSON.parse(listResponseAfterCreate.body)['todos']).toStrictEqual([newTodo])

    const deleteResponse = await server.inject({
      method: 'DELETE',
      url: '/api/v1/todos/3'
    })
    expect(deleteResponse.statusCode).toBe(204)

    const listResponseAfterDelete = await server.inject({
      method: 'GET',
      url: '/api/v1/todos'
    })
    expect(listResponseAfterDelete.statusCode).toBe(200)
    expect(JSON.parse(listResponseAfterDelete.body)['todos']).toStrictEqual([])
  })
})
