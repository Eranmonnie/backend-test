# Fastamoni Inc Coding Exercise

The goal of this task is to assess your proficiency in software engineering that is related to the daily work that we do at Fastamoni. Please follow the instructions below to complete the assessment.

## Tasks

Build a web service using Node.js that can be deployed to AWS, exposes an API and can be consumed from any client.

This service should

- Be deployed on https://render.com
- Allow user create an account with basic user information
- Allow a user login
- Allow a user have a wallet
- Allow a user create a transaction PIN
- Allow a user create a donation to a fellow user (beneficiary)
- Allow a user check how many donations he/she has made
- Have ability to a special thank you message via email or sms or any communication channel, if they make two(2) or more donations.
- Allow a user view all donation made in a given period of time.
- Allow a user view a single donation made to a fellow user (beneficiary)
- Allow a user view the transaction created for a donation

### Documentation

Please deliver documentation of the server that clearly explains the goals of this project and clarifies the API response that is expected.

### Implement Pagination

Please implement pagination to retrieve pages of the resource.

### Security

Please implement the following security controls for your system:

1. Ensure the system is not vulnerable to [SQL injection](https://www.owasp.org/index.php/SQL_Injection)
2. **[BONUS]** Implement an additional security improvement of your choice

### Load Testing

Please implement load testing to ensure your service can handle a high amount of traffic

#### Success Criteria

1. Implement load testing using `artillery`
2. Ensure that load testing is able to be run using `npm test:load`. You can consider using a tool like `forever` to spin up a daemon and kill it after the load test has completed.
3. Test all endpoints under at least `100 rps` for `30s` and ensure that `p99` is under `50ms`
4. Databse actions created are atomic
5. Financial transactions are idempotent
6. Date are UTC Compliant
7. Racing condition is mitigated
