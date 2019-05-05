'use strict';

import { server as _server } from '@hapi/hapi';
import Knex from './knex';

const people = { // our "users database"
    1: {
      id: 1,
      name: 'Jen Jones'
    }
};

// bring your own validation function
const validate = async function (decoded, request) {

    // do your checks to see if the person is valid
    if (!people[decoded.id]) {
      return { isValid: false };
    }
    else {
      return { isValid: true };
    }
};

const init = async () => {

    const server = _server({
        port: 8080,
        host: '0.0.0.0'
    });

    // .register(...) registers a module within the instance of the API. The callback is then used to tell that the loaded module will be used as an authentication strategy. 
    await server.register(require('hapi-auth-jwt2'));


    server.auth.strategy( 'jwt', 'jwt', {

        key: 'vZiYpmTzqXMp8PpYXKwqc9ShQ1UhyAfy',
        validate: validate,
        verifyOptions: {
            algorithms: [ 'HS256' ],
        }

    } );

    server.auth.default('jwt');

    // --------------
    // Routes
    // --------------

    server.route({
        method: 'GET',
        path:'/hello',
        handler: (_request, _reply) => {

            return 'Hello World!';
        }
    });

    server.route( {

        path: '/auth',
        method: 'POST',
        handler: ( request, reply ) => {
    
            // This is a ES6 standard
            const { username, password } = request.payload;
    
            const getOperation = Knex( 'users' ).where( {
    
                // Equiv. to `username: username`
                username,
    
            } ).select( 'guid', 'password' ).then( ( [ user ] ) => {
                if( !user ) {
            
                    reply( {
            
                        error: true,
                        errMessage: 'the specified user was not found',
            
                    } );
            
                    // Force of habit. But most importantly, we don't want to wrap everything else in an `else` block; better is, just return the control.
                    return;
            
                }
                // Honestly, this is VERY insecure. Use some salted-hashing algorithm and then compare it.
                if( user.password === password ) {

                    const token = jwt.sign( {

                        // You can have anything you want here. ANYTHING. As we'll see in a bit, this decoded token is passed onto a request handler.
                        username,
                        scope: user.guid,

                    }, 'vZiYpmTzqXMp8PpYXKwqc9ShQ1UhyAfy', {

                        algorithm: 'HS256',
                        expiresIn: '1h',

                    } );

                    reply( {

                        token,
                        scope: user.guid,

                    } );

                } else {

                    reply( 'incorrect password' );

                }
            } ).catch( ( err ) => {
    
                reply( 'server-side error' );
    
            } );
    
        }
    
    } );

    server.route({
        method: 'GET',
        path:'/birds',
        handler: (_request, reply) => {
           // In general, the Knex operation is like Knex('TABLE_NAME').where(...).chainable(...).then(...)
           const getOperation = Knex( 'birds' ).where( {
               
                isPublic: true

            } ).select( 'name', 'species', 'picture_url' ).then( ( results ) => {
                
                if( !results || results.length === 0 ) {

                    reply( {
        
                        error: true,
                        errMessage: 'no public bird found',
        
                    } );
        
                }

                reply( {

                    dataCount: results.length,
                    data: results,
        
                } );

            } ).catch( ( _err ) => {

                reply( 'server-side error' );
        
            } );
        }
    });

    await server.start();
    console.log('Server running on %ss', server.info.uri);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();